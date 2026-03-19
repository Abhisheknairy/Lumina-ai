"""
Lumina AI — Django Ninja API
Additions in this version:
  - Auto-assign super_admin role to n.abhishek@isteer.com on first login
  - Super Admin endpoints: all users, promote/demote, platform analytics, audit log
  - Knowledge Base endpoints: create, list, invite members, accept invite
  - Collaboration: shared chat sessions scoped to a KB
"""

from ninja import NinjaAPI, Schema
from ninja.security import HttpBearer
from django.http import HttpResponseRedirect, StreamingHttpResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import os, io, docx, time, json, hashlib, secrets
from PyPDF2 import PdfReader
from typing import Optional, List

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_google_genai import ChatGoogleGenerativeAI

from .models import (
    ChatSession, InteractionLog, SourceDocument,
    UserProfile, OAuthSession,
    KnowledgeBase, KBMembership, AdminAuditLog,
    SUPER_ADMIN_EMAIL, ROLE_SUPER_ADMIN, ROLE_ADMIN, ROLE_USER,
    KB_ROLE_VIEWER, KB_ROLE_EDITOR,
)

if os.environ.get("DJANGO_DEBUG", "False").lower() == "true":
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

from pathlib import Path
CURRENT_DIR = Path(__file__).resolve().parent
BASE_DIR    = CURRENT_DIR.parent

CLIENT_SECRETS_FILE = os.environ.get("GOOGLE_CLIENT_SECRETS_FILE", str(BASE_DIR / "client_secret.json"))
CHROMA_PERSIST_DIR  = os.environ.get("CHROMA_PERSIST_DIR", str(BASE_DIR / "chroma_db"))
REDIRECT_URI        = os.environ.get("OAUTH_REDIRECT_URI", "http://localhost:8000/api/auth/callback")
FRONTEND_URL        = os.environ.get("FRONTEND_URL", "http://localhost:5173")
GOOGLE_API_KEY      = os.environ.get("GOOGLE_API_KEY", "AIzaSyC0OzyJH_I-uI8eWmPs0NYZ1XdhQbMsjb4")

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
]
CRED_KEYS = {"token", "refresh_token", "token_uri", "client_id", "client_secret", "scopes"}


# ── Auth guard ────────────────────────────────────────────────────────
class LuminaAuth(HttpBearer):
    def authenticate(self, request, token: str) -> str | None:
        if OAuthSession.objects.filter(user_id=token).exists():
            return token
        return None

lumina_auth = LuminaAuth()
api = NinjaAPI(title="Lumina AI Django API")


# ── Singletons ────────────────────────────────────────────────────────
_embeddings_singleton = None
_chroma_clients: dict = {}


def get_embeddings():
    global _embeddings_singleton
    if _embeddings_singleton is None:
        _embeddings_singleton = HuggingFaceEmbeddings(model_name="paraphrase-MiniLM-L3-v2")
    return _embeddings_singleton


def get_chroma(collection_name: str) -> Chroma:
    if collection_name not in _chroma_clients:
        _chroma_clients[collection_name] = Chroma(
            collection_name=collection_name,
            embedding_function=get_embeddings(),
            persist_directory=CHROMA_PERSIST_DIR,
        )
    return _chroma_clients[collection_name]


# ── DB session helpers ────────────────────────────────────────────────
def save_session(user_id: str, credentials, display_name: str = "", email: str = ""):
    scopes = list(credentials.scopes) if credentials.scopes else []
    OAuthSession.objects.update_or_create(
        user_id=user_id,
        defaults={
            "token":         credentials.token or "",
            "refresh_token": credentials.refresh_token or "",
            "token_uri":     credentials.token_uri or "",
            "client_id":     credentials.client_id or "",
            "client_secret": credentials.client_secret or "",
            "scopes":        json.dumps(scopes),
            "display_name":  display_name,
            "email":         email,
        },
    )


def load_session(user_id: str) -> dict | None:
    try:
        s = OAuthSession.objects.get(user_id=user_id)
        return {
            "token":         s.token,
            "refresh_token": s.refresh_token,
            "token_uri":     s.token_uri,
            "client_id":     s.client_id,
            "client_secret": s.client_secret,
            "scopes":        json.loads(s.scopes) if s.scopes else [],
            "display_name":  s.display_name,
            "email":         s.email,
        }
    except OAuthSession.DoesNotExist:
        return None


def get_creds(user_id: str):
    from google.oauth2.credentials import Credentials
    s = load_session(user_id)
    if not s:
        raise ValueError(f"No session for user {user_id}")
    return Credentials(**{k: v for k, v in s.items() if k in CRED_KEYS})


def generate_session_name(question: str) -> str:
    words = question.strip().split()
    name  = " ".join(words[:6])
    return (name[:60] + "…") if len(name) > 60 else name


def derive_name_from_email(email: str) -> str:
    if not email:
        return ""
    local      = email.split("@")[0]
    parts      = local.replace("_", ".").split(".")
    return " ".join(p.capitalize() for p in parts if p)


def get_user_role(user_id: str) -> str:
    try:
        return UserProfile.objects.get(user_id=user_id).role
    except UserProfile.DoesNotExist:
        return ROLE_USER


def audit(actor_user_id: str, actor_email: str, action: str,
          target_user_id: str = "", target_email: str = "", detail: dict = None):
    AdminAuditLog.objects.create(
        actor_user_id=actor_user_id,
        actor_email=actor_email,
        action=action,
        target_user_id=target_user_id,
        target_email=target_email,
        detail=detail or {},
    )


_oauth_flows: dict = {}


# ── SCHEMAS ───────────────────────────────────────────────────────────
class ChatRequest(Schema):
    question:    str
    folder_name: str = ""
    kb_id:       Optional[int] = None   # set when chatting in a shared KB


class TicketRequest(Schema):
    interaction_id: int
    user_query:     str
    ai_response:    str
    priority:       str = "medium"


class CreateKBRequest(Schema):
    name:        str
    description: str = ""
    folder_id:   str
    folder_name: str = ""
    member_emails: List[str] = []


class UpdateRoleRequest(Schema):
    target_user_id: str
    new_role:       str   # "admin" or "user"


# ═══════════════════════════════════════════════════════════════════════
# 1. AUTH (PUBLIC)
# ═══════════════════════════════════════════════════════════════════════

@api.get("/login")
def login(request, user_id: str):
    flow = Flow.from_client_secrets_file(CLIENT_SECRETS_FILE, scopes=SCOPES, redirect_uri=REDIRECT_URI)
    auth_url, state = flow.authorization_url(access_type="offline", prompt="consent", state=user_id)
    _oauth_flows[state] = flow
    return HttpResponseRedirect(auth_url)


@api.get("/auth/callback")
def auth_callback(request, state: str, code: str):
    flow = _oauth_flows.pop(state, None)
    if not flow:
        return api.create_response(request, {"detail": "Session expired."}, status=400)
 
    flow.fetch_token(code=code)
    credentials  = flow.credentials
    display_name = ""
    email        = ""
 
    # ── Step 1: Try People API (best source — has real name) ──────────
    try:
        people_service = build("people", "v1", credentials=credentials)
        profile = people_service.people().get(
            resourceName="people/me", personFields="names,emailAddresses"
        ).execute()
        names  = profile.get("names", [])
        emails = profile.get("emailAddresses", [])
        if names:
            display_name = names[0].get("displayName", "")
        if emails:
            email = emails[0].get("value", "")
        print(f"[auth_callback] People API OK: name={display_name!r} email={email!r}")
    except Exception as e:
        print(f"[auth_callback] People API failed: {e}")
 
    # ── Step 2: Extract email from id_token if People API failed ──────
    # The id_token is a JWT that Google always includes in the OAuth response.
    # It contains the user's email even when People API is disabled.
    if not email and credentials.id_token:
        try:
            import base64, json as _json
            # JWT payload is the second segment, base64-encoded
            payload_b64 = credentials.id_token.split(".")[1]
            # Add padding if needed
            padding = 4 - len(payload_b64) % 4
            if padding != 4:
                payload_b64 += "=" * padding
            payload = _json.loads(base64.urlsafe_b64decode(payload_b64))
            email        = payload.get("email", "")
            display_name = payload.get("name", display_name)
            print(f"[auth_callback] id_token fallback: name={display_name!r} email={email!r}")
        except Exception as e:
            print(f"[auth_callback] id_token parse failed: {e}")
 
    # ── Step 3: Derive name from email if still blank ─────────────────
    if not display_name and email:
        display_name = derive_name_from_email(email)
        print(f"[auth_callback] Derived name from email: {display_name!r}")
 
    print(f"[auth_callback] Final: email={email!r} name={display_name!r}")
 
    save_session(state, credentials, display_name=display_name, email=email)
 
    # ── Auto-assign role ───────────────────────────────────────────────
    assigned_role = ROLE_SUPER_ADMIN if email == SUPER_ADMIN_EMAIL else ROLE_USER
 
    profile_obj, created = UserProfile.objects.update_or_create(
        user_id=state,
        defaults={"display_name": display_name, "email": email},
    )
 
    # Set role — always enforce super_admin for the designated email
    # Don't demote an existing admin to user on re-login
    if created:
        profile_obj.role = assigned_role
        profile_obj.save(update_fields=["role"])
    elif assigned_role == ROLE_SUPER_ADMIN and profile_obj.role != ROLE_SUPER_ADMIN:
        profile_obj.role = ROLE_SUPER_ADMIN
        profile_obj.save(update_fields=["role"])
    elif email and profile_obj.email != email:
        # Email just became available — update it without changing role
        profile_obj.email = email
        if not profile_obj.display_name:
            profile_obj.display_name = display_name
        profile_obj.save(update_fields=["email", "display_name"])
 
    # Accept any pending KB invitations for this email
    if email:
        KBMembership.objects.filter(
            user_email=email, user_id=""
        ).update(user_id=state, accepted=True)
 
    return HttpResponseRedirect(f"{FRONTEND_URL}/chat?user_id={state}")


@api.get("/get-token/{user_id}")
def get_access_token(request, user_id: str):
    display_name = ""
    email        = ""
    role         = ROLE_USER

    try:
        p = UserProfile.objects.get(user_id=user_id)
        display_name = p.display_name or ""
        email        = p.email or ""
        role         = p.role
    except UserProfile.DoesNotExist:
        pass

    if not display_name and email:
        display_name = derive_name_from_email(email)

    session = load_session(user_id)
    if not session:
        return {"access_token": None, "display_name": display_name, "email": email, "role": role}

    if not display_name:
        sname = session.get("display_name", "")
        import re
        if sname and not re.match(r'^[0-9a-f-]{36}$', sname, re.I):
            display_name = sname
    if not email:
        email = session.get("email", "")
    if not display_name and email:
        display_name = derive_name_from_email(email)

    return {
        "access_token": session["token"],
        "display_name": display_name,
        "email":        email,
        "role":         role,   # frontend uses this to show/hide admin UI
    }


# ── KB invite accept (public — accessed via link)
@api.get("/kb/accept-invite/{token}")
def accept_invite(request, token: str, user_id: str = ""):
    try:
        kb = KnowledgeBase.objects.get(invite_token=token, is_active=True)
    except KnowledgeBase.DoesNotExist:
        return api.create_response(request, {"detail": "Invalid or expired invite link."}, status=404)

    if user_id:
        KBMembership.objects.filter(kb=kb, user_id="").update(user_id=user_id, accepted=True)
        KBMembership.objects.filter(kb=kb, user_id=user_id).update(accepted=True)

    return HttpResponseRedirect(f"{FRONTEND_URL}/chat?user_id={user_id}&kb_id={kb.id}&kb_name={kb.name}")


# ═══════════════════════════════════════════════════════════════════════
# 2. INGESTION (PROTECTED)
# ═══════════════════════════════════════════════════════════════════════

import concurrent.futures


@api.post("/ingest-item/{user_id}/{item_id}", auth=lumina_auth)
def ingest_item(request, user_id: str, item_id: str, kb_id: Optional[int] = None):
    if request.auth != user_id:
        return api.create_response(request, {"detail": "Forbidden"}, status=403)

    creds   = get_creds(user_id)
    service = build("drive", "v3", credentials=creds)

    # Shared KB uses shared collection; personal uses per-user collection
    collection_name = f"kb_{kb_id}" if kb_id else f"user_{user_id}"

    try:
        root_item = service.files().get(
            fileId=item_id, supportsAllDrives=True,
            fields="id, name, mimeType, webViewLink"
        ).execute()
    except Exception as e:
        return api.create_response(request, {"detail": str(e)}, status=500)

    def get_files_recursive(folder_id):
        found, pt = [], None
        while True:
            res = service.files().list(
                q=f"'{folder_id}' in parents and trashed=false",
                corpora="allDrives", includeItemsFromAllDrives=True,
                supportsAllDrives=True,
                fields="nextPageToken, files(id, name, mimeType, webViewLink)",
                pageSize=1000, pageToken=pt,
            ).execute()
            for it in res.get("files", []):
                if it["mimeType"] == "application/vnd.google-apps.folder":
                    found.extend(get_files_recursive(it["id"]))
                else:
                    found.append(it)
            pt = res.get("nextPageToken")
            if not pt:
                break
        return found

    files_to_process = (
        get_files_recursive(item_id)
        if root_item["mimeType"] == "application/vnd.google-apps.folder"
        else [root_item]
    )

    # ── FIX: Check if already indexed before streaming ────────────────
    def is_already_ingested(file_id: str) -> bool:
        """Returns True if chunk 0 of this file already exists in Chroma."""
        chunk_0_id = hashlib.sha256(
            f"{collection_name}::{file_id}::0".encode()
        ).hexdigest()
        try:
            result = get_chroma(collection_name)._collection.get(ids=[chunk_0_id])
            return len(result["ids"]) > 0
        except Exception:
            return False

    files_to_download = [f for f in files_to_process if not is_already_ingested(f["id"])]

    # All files already indexed — return plain JSON (not streaming)
    # Frontend detects this by content-type not being ndjson
    if not files_to_download:
        return {
            "already_indexed":    True,
            "message":            "This folder is already indexed and ready to use.",
            "files_processed":    0,
            "files_skipped":      len(files_to_process),
            "total_chunks_saved": 0,
            "item_name":          root_item["name"],
        }

    # ── New/partial folder — stream live progress ─────────────────────
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)

    def stream_ingestion():
        total         = len(files_to_download)
        all_chunks    = []
        all_metadatas = []
        all_ids       = []
        files_done    = 0

        for idx, f in enumerate(files_to_download):
            file_name  = f.get("name", f["id"])
            mime_type  = f["mimeType"]
            drive_link = f.get("webViewLink") or f"https://drive.google.com/file/d/{f['id']}/view"

            yield json.dumps({"type": "progress", "current": idx+1, "total": total,
                              "file": file_name, "status": "processing"}) + "\n"

            text_content = ""
            try:
                if mime_type == "application/vnd.google-apps.document":
                    text_content = service.files().export_media(fileId=f["id"], mimeType="text/plain").execute().decode("utf-8")
                elif mime_type == "application/vnd.google-apps.spreadsheet":
                    text_content = service.files().export_media(fileId=f["id"], mimeType="text/csv").execute().decode("utf-8")
                elif mime_type == "application/vnd.google-apps.presentation":
                    text_content = service.files().export_media(fileId=f["id"], mimeType="text/plain").execute().decode("utf-8")
                elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                    doc = docx.Document(io.BytesIO(service.files().get_media(fileId=f["id"]).execute()))
                    text_content = "\n".join([p.text for p in doc.paragraphs])
                elif mime_type == "application/pdf":
                    pdf = PdfReader(io.BytesIO(service.files().get_media(fileId=f["id"]).execute()))
                    text_content = "\n".join([p.extract_text() for p in pdf.pages if p.extract_text()])
                else:
                    text_content = service.files().get_media(fileId=f["id"]).execute().decode("utf-8", errors="ignore")
            except Exception as e:
                print(f"[ingest] Skipped '{file_name}': {e}")
                yield json.dumps({"type": "progress", "current": idx+1, "total": total,
                                  "file": file_name, "status": "skipped"}) + "\n"
                continue

            if text_content.strip():
                chunks = text_splitter.split_text(text_content)
                for i, chunk in enumerate(chunks):
                    chunk_id = hashlib.sha256(f"{collection_name}::{f['id']}::{i}".encode()).hexdigest()
                    all_chunks.append(chunk)
                    all_metadatas.append({
                        "source": file_name, "source_link": drive_link,
                        "file_id": f["id"], "user_id": user_id,
                    })
                    all_ids.append(chunk_id)
                files_done += 1

            yield json.dumps({"type": "progress", "current": idx+1, "total": total,
                              "file": file_name, "status": "done"}) + "\n"

        if all_chunks:
            yield json.dumps({"type": "progress", "current": total, "total": total,
                              "file": "", "status": "embedding"}) + "\n"
            try:
                embedded = get_embeddings().embed_documents(all_chunks)
                vs = get_chroma(collection_name)
                vs._collection.upsert(documents=all_chunks, metadatas=all_metadatas,
                                      ids=all_ids, embeddings=embedded)
                _chroma_clients.pop(collection_name, None)
                yield json.dumps({
                    "type": "done", "already_indexed": False,
                    "files_processed": files_done,
                    "total_chunks_saved": len(all_chunks),
                    "item_name": root_item["name"],
                }) + "\n"
            except Exception as e:
                yield json.dumps({"type": "error", "detail": str(e)}) + "\n"
        else:
            yield json.dumps({"type": "error", "detail": "No readable text found."}) + "\n"

    return StreamingHttpResponse(stream_ingestion(), content_type="application/x-ndjson")

# ═══════════════════════════════════════════════════════════════════════
# 3. CHAT (PROTECTED, streaming)
# ═══════════════════════════════════════════════════════════════════════

@api.post("/chat/{user_id}/{folder_id}", auth=lumina_auth)
def chat_with_documents(request, user_id: str, folder_id: str, payload: ChatRequest):
    if request.auth != user_id:
        return api.create_response(request, {"detail": "Forbidden"}, status=403)

    # For KB chats verify membership
    kb_obj = None
    if payload.kb_id:
        try:
            kb_obj = KnowledgeBase.objects.get(id=payload.kb_id, is_active=True)
            if not KBMembership.objects.filter(kb=kb_obj, user_id=user_id, accepted=True).exists():
                return api.create_response(request, {"detail": "Not a member of this knowledge base."}, status=403)
        except KnowledgeBase.DoesNotExist:
            return api.create_response(request, {"detail": "Knowledge base not found."}, status=404)

    collection_name = f"kb_{payload.kb_id}" if payload.kb_id else f"user_{user_id}"
    start_time      = time.time()
    vector_store    = get_chroma(collection_name)
    docs            = vector_store.similarity_search(query=payload.question, k=4)

    context_text = (
        "\n\n---\n\n".join([doc.page_content for doc in docs])
        if docs else "No relevant documents found."
    )
    prompt = (
        "You are a helpful assistant. Answer ONLY from the provided context.\n"
        "If context doesn't contain the answer, say so clearly.\n\n"
        f"Context:\n{context_text}\n\nQuestion: {payload.question}"
    )

    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=GOOGLE_API_KEY, temperature=0.3)

    sources_with_links: dict = {}
    for doc in docs:
        name = doc.metadata.get("source", "Unknown")
        link = doc.metadata.get("source_link", "")
        if name not in sources_with_links:
            sources_with_links[name] = link

    def stream_response():
        full_response = ""
        for chunk in llm.stream(prompt):
            token = chunk.content
            full_response += token
            yield json.dumps({"type": "token", "content": token}) + "\n"

        response_time_ms = int((time.time() - start_time) * 1000)
        interaction_id   = None
        try:
            session, created = ChatSession.objects.get_or_create(
                user_id=user_id,
                folder_id=folder_id,
                kb=kb_obj,
                defaults={
                    "folder_name":  payload.folder_name or folder_id,
                    "session_name": generate_session_name(payload.question),
                },
            )
            if not created and payload.folder_name and session.folder_name != payload.folder_name:
                session.folder_name = payload.folder_name
                session.save(update_fields=["folder_name", "updated_at"])

            interaction = InteractionLog.objects.create(
                session=session,
                user_query=payload.question,
                ai_response=full_response,
                response_time_ms=response_time_ms,
            )
            interaction_id = interaction.id

            for doc_name, doc_link in sources_with_links.items():
                SourceDocument.objects.create(
                    interaction=interaction,
                    document_name=doc_name,
                    document_link=doc_link or None,
                )
        except Exception as e:
            print(f"[chat] DB logging failed: {e}")

        yield json.dumps({
            "type": "done",
            "sources": [{"name": n, "link": l} for n, l in sources_with_links.items()],
            "response_time_ms": response_time_ms,
            "interaction_id":   interaction_id,
        }) + "\n"

    return StreamingHttpResponse(stream_response(), content_type="application/x-ndjson")


# ═══════════════════════════════════════════════════════════════════════
# 4. SESSION HISTORY (PROTECTED)
# ═══════════════════════════════════════════════════════════════════════

@api.get("/sessions/{user_id}", auth=lumina_auth)
def get_sessions(request, user_id: str):
    if request.auth != user_id:
        return api.create_response(request, {"detail": "Forbidden"}, status=403)

    # Personal sessions
    personal = ChatSession.objects.filter(user_id=user_id, kb__isnull=True).order_by("-updated_at")[:50]

    # Shared KB sessions the user is a member of
    member_kbs = KBMembership.objects.filter(user_id=user_id, accepted=True).values_list("kb_id", flat=True)
    shared = ChatSession.objects.filter(kb_id__in=member_kbs).order_by("-updated_at")[:20]

    def serialise(s, is_shared=False):
        return {
            "id":            s.id,
            "session_name":  s.session_name or s.folder_name or "Untitled Chat",
            "folder_name":   s.folder_name,
            "folder_id":     s.folder_id,
            "updated_at":    s.updated_at.isoformat(),
            "message_count": s.interactions.count(),
            "is_shared":     is_shared,
            "kb_id":         s.kb_id,
            "kb_name":       s.kb.name if s.kb else None,
        }

    return {
        "personal": [serialise(s) for s in personal],
        "shared":   [serialise(s, is_shared=True) for s in shared],
    }


@api.get("/sessions/{user_id}/{session_id}/messages", auth=lumina_auth)
def get_session_messages(request, user_id: str, session_id: int):
    if request.auth != user_id:
        return api.create_response(request, {"detail": "Forbidden"}, status=403)

    try:
        session = ChatSession.objects.get(id=session_id)
        # Check access — own session or KB member
        if session.user_id != user_id:
            if not session.kb or not KBMembership.objects.filter(
                kb=session.kb, user_id=user_id, accepted=True
            ).exists():
                return api.create_response(request, {"detail": "Forbidden"}, status=403)
    except ChatSession.DoesNotExist:
        return api.create_response(request, {"detail": "Session not found"}, status=404)

    interactions = session.interactions.prefetch_related("sources").order_by("created_at")
    messages = []
    for i in interactions:
        messages.append({"role": "user", "content": i.user_query, "sources": [], "interaction_id": None})
        messages.append({
            "role": "bot", "content": i.ai_response,
            "sources": [{"name": s.document_name, "link": s.document_link or ""} for s in i.sources.all()],
            "interaction_id": i.id, "response_time_ms": i.response_time_ms,
        })

    return {
        "session_id":   session.id,
        "session_name": session.session_name or session.folder_name,
        "folder_id":    session.folder_id,
        "folder_name":  session.folder_name,
        "kb_id":        session.kb_id,
        "kb_name":      session.kb.name if session.kb else None,
        "messages":     messages,
    }


# ═══════════════════════════════════════════════════════════════════════
# 5. RAISE TICKET (PROTECTED)
# ═══════════════════════════════════════════════════════════════════════

@api.post("/raise-ticket/{user_id}", auth=lumina_auth)
def raise_ticket(request, user_id: str, payload: TicketRequest):
    if request.auth != user_id:
        return api.create_response(request, {"detail": "Forbidden"}, status=403)
    try:
        if payload.interaction_id is not None:
            InteractionLog.objects.filter(id=payload.interaction_id).update(ticket_raised=True)
        return {"success": True, "message": "Ticket raised successfully.", "interaction_id": payload.interaction_id}
    except Exception as e:
        return api.create_response(request, {"detail": str(e)}, status=500)


# ═══════════════════════════════════════════════════════════════════════
# 6. ANALYTICS (PROTECTED)
# ═══════════════════════════════════════════════════════════════════════

@api.get("/analytics/{user_id}", auth=lumina_auth)
def get_analytics(request, user_id: str):
    if request.auth != user_id:
        return api.create_response(request, {"detail": "Forbidden"}, status=403)

    from django.db.models import Avg, Count, Q
    from django.db.models.functions import TruncDate
    from django.utils import timezone
    from datetime import timedelta

    sessions     = ChatSession.objects.filter(user_id=user_id)
    interactions = InteractionLog.objects.filter(session__in=sessions)

    total_queries           = interactions.count()
    tickets_raised          = interactions.filter(ticket_raised=True).count()
    resolved_without_ticket = total_queries - tickets_raised
    deflection_rate = round((resolved_without_ticket / total_queries) * 100, 1) if total_queries > 0 else 0
    avg_response_ms = interactions.aggregate(avg=Avg("response_time_ms"))["avg"] or 0
    slow_responses  = interactions.filter(response_time_ms__gt=3000).count()

    last_14 = timezone.now() - timedelta(days=14)
    daily_data = (
        interactions.filter(created_at__gte=last_14)
        .annotate(date=TruncDate("created_at"))
        .values("date")
        .annotate(queries=Count("id"), tickets=Count("id", filter=Q(ticket_raised=True)))
        .order_by("date")
    )
    daily_map = {e["date"].isoformat(): e for e in daily_data}
    timeline = []
    for i in range(14):
        day = (timezone.now() - timedelta(days=13 - i)).date()
        e   = daily_map.get(day.isoformat(), {})
        timeline.append({"date": day.isoformat(), "queries": e.get("queries", 0), "tickets": e.get("tickets", 0)})

    profile = {}
    try:
        p = UserProfile.objects.get(user_id=user_id)
        profile = {"display_name": p.display_name, "email": p.email, "role": p.role}
    except UserProfile.DoesNotExist:
        profile = {"display_name": "", "email": "", "role": ROLE_USER}

    return {
        "total_queries": total_queries, "tickets_raised": tickets_raised,
        "resolved_without_ticket": resolved_without_ticket,
        "deflection_rate_percent": deflection_rate,
        "avg_response_time_ms": round(avg_response_ms),
        "slow_responses_over_3s": slow_responses,
        "sessions_count": sessions.count(),
        "timeline": timeline, "user_profile": profile,
    }


# ═══════════════════════════════════════════════════════════════════════
# 7. KNOWLEDGE BASE (PROTECTED — admin or above)
# ═══════════════════════════════════════════════════════════════════════

def require_admin(user_id: str):
    """Returns True if user is admin or super_admin, False otherwise."""
    role = get_user_role(user_id)
    return role in (ROLE_SUPER_ADMIN, ROLE_ADMIN)


@api.post("/kb/create", auth=lumina_auth)
def create_knowledge_base(request, payload: CreateKBRequest):
    user_id = request.auth
    if not require_admin(user_id):
        return api.create_response(request, {"detail": "Admins only."}, status=403)

    try:
        actor = UserProfile.objects.get(user_id=user_id)
    except UserProfile.DoesNotExist:
        return api.create_response(request, {"detail": "Profile not found."}, status=400)

    # Generate unique invite token
    token = secrets.token_urlsafe(32)
    while KnowledgeBase.objects.filter(invite_token=token).exists():
        token = secrets.token_urlsafe(32)

    kb = KnowledgeBase.objects.create(
        name=payload.name,
        description=payload.description,
        folder_id=payload.folder_id,
        folder_name=payload.folder_name,
        created_by=user_id,
        invite_token=token,
    )

    # Add creator as editor
    KBMembership.objects.create(kb=kb, user_id=user_id, user_email=actor.email,
                                role=KB_ROLE_EDITOR, accepted=True)

    # Invite other members by email
    for email in payload.member_emails:
        email = email.strip().lower()
        if email and email != actor.email:
            # Check if this user already has a profile (already logged in)
            try:
                existing = UserProfile.objects.get(email=email)
                KBMembership.objects.get_or_create(
                    kb=kb, user_email=email,
                    defaults={"user_id": existing.user_id, "accepted": True}
                )
            except UserProfile.DoesNotExist:
                # Not yet logged in — membership without user_id, accepted on first login
                KBMembership.objects.get_or_create(kb=kb, user_email=email)

    audit(user_id, actor.email, "create_kb", detail={"kb_id": kb.id, "kb_name": kb.name})

    invite_link = f"{FRONTEND_URL}/kb/join/{token}"
    return {
        "id":           kb.id,
        "name":         kb.name,
        "invite_token": token,
        "invite_link":  invite_link,
        "folder_id":    kb.folder_id,
        "folder_name":  kb.folder_name,
        "member_count": kb.memberships.count(),
    }


@api.get("/kb/list", auth=lumina_auth)
def list_knowledge_bases(request):
    """Returns KBs the current user is a member of."""
    user_id = request.auth
    member_kb_ids = KBMembership.objects.filter(user_id=user_id, accepted=True).values_list("kb_id", flat=True)
    kbs = KnowledgeBase.objects.filter(id__in=member_kb_ids, is_active=True)
    return [
        {
            "id":           kb.id,
            "name":         kb.name,
            "description":  kb.description,
            "folder_id":    kb.folder_id,
            "folder_name":  kb.folder_name,
            "created_by":   kb.created_by,
            "member_count": kb.memberships.filter(accepted=True).count(),
            "invite_link":  f"{FRONTEND_URL}/kb/join/{kb.invite_token}",
            "is_creator":   kb.created_by == user_id,
            "created_at":   kb.created_at.isoformat(),
        }
        for kb in kbs
    ]


@api.post("/kb/{kb_id}/add-member", auth=lumina_auth)
def add_kb_member(request, kb_id: int, email: str, role: str = KB_ROLE_VIEWER):
    user_id = request.auth
    if not require_admin(user_id):
        return api.create_response(request, {"detail": "Admins only."}, status=403)

    try:
        kb = KnowledgeBase.objects.get(id=kb_id)
    except KnowledgeBase.DoesNotExist:
        return api.create_response(request, {"detail": "KB not found."}, status=404)

    email = email.strip().lower()
    try:
        existing = UserProfile.objects.get(email=email)
        m, _ = KBMembership.objects.get_or_create(
            kb=kb, user_email=email,
            defaults={"user_id": existing.user_id, "role": role, "accepted": True}
        )
    except UserProfile.DoesNotExist:
        m, _ = KBMembership.objects.get_or_create(kb=kb, user_email=email,
                                                    defaults={"role": role})

    actor = UserProfile.objects.get(user_id=user_id)
    audit(user_id, actor.email, "add_kb_member", detail={"kb_id": kb_id, "email": email})

    return {"success": True, "invite_link": f"{FRONTEND_URL}/kb/join/{kb.invite_token}"}


@api.delete("/kb/{kb_id}", auth=lumina_auth)
def deactivate_kb(request, kb_id: int):
    user_id = request.auth
    if not require_admin(user_id):
        return api.create_response(request, {"detail": "Admins only."}, status=403)
    try:
        kb = KnowledgeBase.objects.get(id=kb_id)
        kb.is_active = False
        kb.save(update_fields=["is_active"])
        actor = UserProfile.objects.get(user_id=user_id)
        audit(user_id, actor.email, "deactivate_kb", detail={"kb_id": kb_id, "kb_name": kb.name})
        return {"success": True}
    except KnowledgeBase.DoesNotExist:
        return api.create_response(request, {"detail": "Not found."}, status=404)


# ═══════════════════════════════════════════════════════════════════════
# 8. SUPER ADMIN ENDPOINTS (PROTECTED — super_admin only)
# ═══════════════════════════════════════════════════════════════════════

def require_super_admin(user_id: str):
    return get_user_role(user_id) == ROLE_SUPER_ADMIN


@api.get("/admin/users", auth=lumina_auth)
def admin_list_users(request):
    """Super admin: full list of all users with stats."""
    user_id = request.auth
    if not require_super_admin(user_id):
        return api.create_response(request, {"detail": "Super admin only."}, status=403)

    from django.db.models import Count, Max

    profiles = UserProfile.objects.all().order_by("-last_seen")
    result = []
    for p in profiles:
        sessions = ChatSession.objects.filter(user_id=p.user_id)
        interactions = InteractionLog.objects.filter(session__in=sessions)
        result.append({
            "user_id":        p.user_id,
            "display_name":   p.display_name,
            "email":          p.email,
            "role":           p.role,
            "last_seen":      p.last_seen.isoformat(),
            "joined":         p.created_at.isoformat(),
            "session_count":  sessions.count(),
            "query_count":    interactions.count(),
            "tickets_raised": interactions.filter(ticket_raised=True).count(),
            "files_accessed": SourceDocument.objects.filter(
                interaction__session__in=sessions
            ).values("document_name").distinct().count(),
        })
    return result


@api.post("/admin/update-role", auth=lumina_auth)
def admin_update_role(request, payload: UpdateRoleRequest):
    """Super admin: promote or demote a user."""
    actor_id = request.auth
    if not require_super_admin(actor_id):
        return api.create_response(request, {"detail": "Super admin only."}, status=403)

    if payload.new_role not in (ROLE_ADMIN, ROLE_USER):
        return api.create_response(request, {"detail": "Role must be 'admin' or 'user'."}, status=400)

    try:
        target = UserProfile.objects.get(user_id=payload.target_user_id)
    except UserProfile.DoesNotExist:
        return api.create_response(request, {"detail": "User not found."}, status=404)

    if target.role == ROLE_SUPER_ADMIN:
        return api.create_response(request, {"detail": "Cannot change super admin role."}, status=403)

    old_role    = target.role
    target.role = payload.new_role
    target.save(update_fields=["role"])

    actor = UserProfile.objects.get(user_id=actor_id)
    audit(
        actor_id, actor.email,
        action=f"promote_to_{payload.new_role}" if payload.new_role == ROLE_ADMIN else "demote_to_user",
        target_user_id=target.user_id,
        target_email=target.email,
        detail={"old_role": old_role, "new_role": payload.new_role},
    )

    return {"success": True, "user_id": target.user_id, "email": target.email, "new_role": target.role}


@api.get("/admin/analytics", auth=lumina_auth)
def admin_platform_analytics(request):
    """Super admin: platform-wide analytics across all users."""
    user_id = request.auth
    if not require_super_admin(user_id):
        return api.create_response(request, {"detail": "Super admin only."}, status=403)

    from django.db.models import Avg, Count, Q
    from django.db.models.functions import TruncDate
    from django.utils import timezone
    from datetime import timedelta

    all_interactions = InteractionLog.objects.all()
    total_queries    = all_interactions.count()
    tickets_raised   = all_interactions.filter(ticket_raised=True).count()
    resolved         = total_queries - tickets_raised
    deflection_rate  = round((resolved / total_queries) * 100, 1) if total_queries > 0 else 0
    avg_response_ms  = all_interactions.aggregate(avg=Avg("response_time_ms"))["avg"] or 0
    slow_responses   = all_interactions.filter(response_time_ms__gt=3000).count()

    last_14 = timezone.now() - timedelta(days=14)
    daily_data = (
        all_interactions.filter(created_at__gte=last_14)
        .annotate(date=TruncDate("created_at"))
        .values("date")
        .annotate(queries=Count("id"), tickets=Count("id", filter=Q(ticket_raised=True)))
        .order_by("date")
    )
    daily_map = {e["date"].isoformat(): e for e in daily_data}
    timeline = []
    for i in range(14):
        day = (timezone.now() - timedelta(days=13 - i)).date()
        e   = daily_map.get(day.isoformat(), {})
        timeline.append({"date": day.isoformat(), "queries": e.get("queries", 0), "tickets": e.get("tickets", 0)})

    return {
        "total_users":             UserProfile.objects.count(),
        "total_sessions":          ChatSession.objects.count(),
        "total_queries":           total_queries,
        "tickets_raised":          tickets_raised,
        "resolved_without_ticket": resolved,
        "deflection_rate_percent": deflection_rate,
        "avg_response_time_ms":    round(avg_response_ms),
        "slow_responses_over_3s":  slow_responses,
        "total_knowledge_bases":   KnowledgeBase.objects.filter(is_active=True).count(),
        "timeline":                timeline,
    }


@api.get("/admin/audit-log", auth=lumina_auth)
def admin_audit_log(request, limit: int = 100):
    """Super admin: full audit log of all admin actions."""
    user_id = request.auth
    if not require_super_admin(user_id):
        return api.create_response(request, {"detail": "Super admin only."}, status=403)

    logs = AdminAuditLog.objects.all().order_by("-timestamp")[:limit]
    return [
        {
            "id":             log.id,
            "actor_email":    log.actor_email,
            "action":         log.action,
            "target_email":   log.target_email,
            "detail":         log.detail,
            "timestamp":      log.timestamp.isoformat(),
        }
        for log in logs
    ]


@api.get("/admin/kb-list", auth=lumina_auth)
def admin_list_all_kbs(request):
    """Super admin: all knowledge bases across the platform."""
    user_id = request.auth
    if not require_super_admin(user_id):
        return api.create_response(request, {"detail": "Super admin only."}, status=403)

    kbs = KnowledgeBase.objects.all().order_by("-created_at")
    result = []
    for kb in kbs:
        try:
            creator = UserProfile.objects.get(user_id=kb.created_by)
            creator_name = creator.display_name or creator.email
        except UserProfile.DoesNotExist:
            creator_name = kb.created_by
        result.append({
            "id":           kb.id,
            "name":         kb.name,
            "description":  kb.description,
            "folder_name":  kb.folder_name,
            "created_by":   creator_name,
            "is_active":    kb.is_active,
            "member_count": kb.memberships.filter(accepted=True).count(),
            "session_count": kb.sessions.count(),
            "created_at":   kb.created_at.isoformat(),
        })
    return result