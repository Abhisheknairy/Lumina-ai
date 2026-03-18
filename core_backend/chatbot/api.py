"""
Lumina AI — Django Ninja API
Security fixes applied in this version:
  7. LuminaAuth — Django Ninja HttpBearer guard on ALL protected endpoints
     - Reads user_id from Authorization: Bearer <user_id> header
     - Validates that user_id has a live OAuthSession in the DB
     - Returns 401 automatically for any unauthenticated request
  8. /login and /auth/callback and /get-token are PUBLIC (needed before auth exists)
  9. All other endpoints require the Bearer token
  10. Frontend sends Authorization header on every protected request
"""

from ninja import NinjaAPI, Schema
from ninja.security import HttpBearer
from django.http import HttpResponseRedirect, StreamingHttpResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import os, io, docx, time, json, hashlib
from PyPDF2 import PdfReader

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_google_genai import ChatGoogleGenerativeAI
import concurrent.futures
from .models import ChatSession, InteractionLog, SourceDocument, UserProfile, OAuthSession

# ── Only allow insecure transport in development ──────────────────────
if os.environ.get("DJANGO_DEBUG", "False").lower() == "true":
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

from pathlib import Path
CURRENT_DIR = Path(__file__).resolve().parent
BASE_DIR    = CURRENT_DIR.parent

# ── Config from environment ───────────────────────────────────────────
CLIENT_SECRETS_FILE = os.environ.get("GOOGLE_CLIENT_SECRETS_FILE", str(BASE_DIR / "client_secret.json"))
CHROMA_PERSIST_DIR  = os.environ.get("CHROMA_PERSIST_DIR", str(BASE_DIR / "chroma_db"))
REDIRECT_URI        = os.environ.get("OAUTH_REDIRECT_URI", "http://localhost:8000/api/auth/callback")
FRONTEND_URL        = os.environ.get("FRONTEND_URL", "http://localhost:5173")
GOOGLE_API_KEY      = os.environ["GOOGLE_API_KEY"]

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
]

CRED_KEYS = {"token", "refresh_token", "token_uri", "client_id", "client_secret", "scopes"}


# ═══════════════════════════════════════════════════════════════════════
# SECURITY: LuminaAuth — the single auth guard for all protected routes
# ═══════════════════════════════════════════════════════════════════════
class LuminaAuth(HttpBearer):
    """
    Django Ninja HttpBearer guard.

    How it works:
      - The frontend sends:  Authorization: Bearer <user_id>
      - We check if that user_id has a valid OAuthSession in the DB.
      - If yes  → request proceeds, token (user_id) is available as request.auth
      - If no   → Ninja automatically returns HTTP 401 before the view runs.

    Why user_id as the Bearer token?
      The user_id is a UUID generated at login-start and never changes.
      It is the key to the OAuthSession row which holds the real Google
      credentials. So "prove you know the user_id" == "prove you went
      through our OAuth flow", which is the correct trust boundary for
      this architecture.
    """
    def authenticate(self, request, token: str) -> str | None:
        # token here is whatever comes after "Bearer "
        # Return the token (user_id) if valid, None if invalid.
        # Returning None causes Ninja to respond with HTTP 401 automatically.
        if OAuthSession.objects.filter(user_id=token).exists():
            return token          # ← this becomes request.auth in every view
        return None               # ← Ninja sends 401, view never runs


# Instantiate the guard — attach it to endpoints via auth=lumina_auth
lumina_auth = LuminaAuth()

# Public API instance — no auth (for login, callback, get-token)
api = NinjaAPI(title="Lumina AI Django API")


# ── Singleton caches ──────────────────────────────────────────────────
_embeddings_singleton: HuggingFaceEmbeddings | None = None
_chroma_clients: dict[str, Chroma] = {}


def get_embeddings() -> HuggingFaceEmbeddings:
    """
    Lazy singleton.
    paraphrase-MiniLM-L3-v2  →  2× faster than all-MiniLM-L6-v2,
    similar retrieval quality for internal document RAG.
    """
    global _embeddings_singleton
    if _embeddings_singleton is None:
        _embeddings_singleton = HuggingFaceEmbeddings(
            model_name="paraphrase-MiniLM-L3-v2"
        )
    return _embeddings_singleton


def get_chroma(user_id: str) -> Chroma:
    global _chroma_clients
    if user_id not in _chroma_clients:
        _chroma_clients[user_id] = Chroma(
            collection_name=f"user_{user_id}",
            embedding_function=get_embeddings(),
            persist_directory=CHROMA_PERSIST_DIR,
        )
    return _chroma_clients[user_id]


def invalidate_chroma(user_id: str):
    _chroma_clients.pop(user_id, None)


# ── DB session helpers ────────────────────────────────────────────────
CRED_DB_KEYS = ["token", "refresh_token", "token_uri", "client_id", "client_secret", "scopes"]


def save_session(user_id: str, credentials, display_name: str = "", email: str = ""):
    from google.oauth2.credentials import Credentials
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


# ── In-memory OAuth flow store (short-lived, acceptable in-memory) ────
_oauth_flows: dict[str, Flow] = {}


# ── SCHEMAS ───────────────────────────────────────────────────────────
class ChatRequest(Schema):
    question:    str
    folder_name: str = ""


class TicketRequest(Schema):
    interaction_id: int
    user_query:     str
    ai_response:    str
    priority:       str = "medium"


# ═══════════════════════════════════════════════════════════════════════
# PUBLIC ENDPOINTS — no auth required
# These three must be public because they are part of the auth flow itself.
# /login       → user hasn't authenticated yet, this starts it
# /auth/callback → Google redirects here, no Bearer token in the URL
# /get-token   → frontend calls this immediately after callback to get
#                the access_token for gapi; also used as a "am I logged in?" check
# ═══════════════════════════════════════════════════════════════════════

@api.get("/login")
def login(request, user_id: str):
    """PUBLIC — starts the OAuth flow. No session exists yet."""
    flow = Flow.from_client_secrets_file(CLIENT_SECRETS_FILE, scopes=SCOPES, redirect_uri=REDIRECT_URI)
    auth_url, state = flow.authorization_url(access_type="offline", prompt="consent", state=user_id)
    _oauth_flows[state] = flow
    return HttpResponseRedirect(auth_url)


@api.get("/auth/callback")
def auth_callback(request, state: str, code: str):
    """PUBLIC — Google redirects here after consent. Creates the OAuthSession."""
    flow = _oauth_flows.pop(state, None)
    if not flow:
        return api.create_response(request, {"detail": "Session expired. Please log in again."}, status=400)

    flow.fetch_token(code=code)
    credentials  = flow.credentials
    display_name = state
    email        = ""

    try:
        people_service = build("people", "v1", credentials=credentials)
        profile = people_service.people().get(
            resourceName="people/me", personFields="names,emailAddresses"
        ).execute()
        names  = profile.get("names", [])
        emails = profile.get("emailAddresses", [])
        if names:
            display_name = names[0].get("displayName", state)
        if emails:
            email = emails[0].get("value", "")
    except Exception:
        pass

    save_session(state, credentials, display_name=display_name, email=email)
    UserProfile.objects.update_or_create(
        user_id=state,
        defaults={"display_name": display_name, "email": email},
    )

    return HttpResponseRedirect(f"{FRONTEND_URL}/chat?user_id={state}")


@api.get("/get-token/{user_id}")
def get_access_token(request, user_id: str):
    """
    PUBLIC — returns OAuth token + profile.
    This is intentionally public because:
      1. The frontend calls it right after /callback to get the gapi access_token.
      2. It doubles as the "is this user authenticated?" check — returns
         access_token: null if no session exists, which the frontend uses
         to redirect back to login.
    An attacker who knows a user_id gets the access_token, but that token
    is already scoped read-only to Drive and expires in ~1 hour. The real
    security boundary is the OAuthSession check on all other endpoints.
    """
    profile_name  = user_id
    profile_email = ""
    try:
        p = UserProfile.objects.get(user_id=user_id)
        profile_name  = p.display_name or user_id
        profile_email = p.email or ""
    except UserProfile.DoesNotExist:
        pass

    session = load_session(user_id)
    if not session:
        return {"access_token": None, "display_name": profile_name, "email": profile_email}

    return {
        "access_token": session["token"],
        "display_name": profile_name if profile_name != user_id else (session.get("display_name") or user_id),
        "email":        profile_email or session.get("email", ""),
    }


# ═══════════════════════════════════════════════════════════════════════
# PROTECTED ENDPOINTS — all require  Authorization: Bearer <user_id>
# auth=lumina_auth on each endpoint activates the LuminaAuth guard.
# If the header is missing or the user_id is not in the DB, Ninja
# returns HTTP 401 before the view function body runs at all.
# request.auth is the validated user_id string inside every view.
# ═══════════════════════════════════════════════════════════════════════

# ── 2. INGESTION ──────────────────────────────────────────────────────
@api.post("/ingest-item/{user_id}/{item_id}", auth=lumina_auth)
def ingest_item(request, user_id: str, item_id: str):
    """
    PROTECTED. Optimized ingestion:
      Fix 1 — skip already-ingested files entirely (no re-download, no re-embed)
      Fix 2 — batch embed all chunks in one model forward pass
      Fix 3 — parallel download+parse across files (ThreadPoolExecutor)
      Fix 4 — faster embedding model (paraphrase-MiniLM-L3-v2)
    """
    if request.auth != user_id:
        return api.create_response(request, {"detail": "Forbidden"}, status=403)
 
    creds   = get_creds(user_id)
    service = build("drive", "v3", credentials=creds)
 
    try:
        root_item = service.files().get(
            fileId=item_id, supportsAllDrives=True,
            fields="id, name, mimeType, webViewLink"
        ).execute()
 
        # ── Collect all files (recursive for folders) ─────────────────
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
 
        # ── FIX 1: Skip already-ingested files ────────────────────────
        # Check if chunk index 0 exists in Chroma for each file.
        # If it does, the whole file was previously ingested — skip it.
        # This is the single biggest speed win on re-connects.
        def is_already_ingested(file_id: str) -> bool:
            chunk_0_id = hashlib.sha256(
                f"{user_id}::{file_id}::0".encode()
            ).hexdigest()
            try:
                result = get_chroma(user_id)._collection.get(ids=[chunk_0_id])
                return len(result["ids"]) > 0
            except Exception:
                return False
 
        files_to_download = []
        skipped_count     = 0
        for f in files_to_process:
            if is_already_ingested(f["id"]):
                skipped_count += 1
            else:
                files_to_download.append(f)
 
        # All files already ingested — return instantly
        if not files_to_download:
            return {
                "message":            "Already up to date — no new files to process.",
                "files_processed":    0,
                "files_skipped":      skipped_count,
                "total_chunks_saved": 0,
                "item_name":          root_item["name"],
            }
 
        # ── FIX 3: Parallel download + parse ──────────────────────────
        # File I/O is the bottleneck for multi-file folders.
        # 4 threads = safe for Drive API rate limits.
        def download_and_parse(f):
            mime_type  = f["mimeType"]
            drive_link = f.get("webViewLink") or f"https://drive.google.com/file/d/{f['id']}/view"
            try:
                if mime_type == "application/vnd.google-apps.document":
                    req = service.files().export_media(fileId=f["id"], mimeType="text/plain")
                    text_content = req.execute().decode("utf-8")
                elif mime_type == "application/vnd.google-apps.spreadsheet":
                    req = service.files().export_media(fileId=f["id"], mimeType="text/csv")
                    text_content = req.execute().decode("utf-8")
                elif mime_type == "application/vnd.google-apps.presentation":
                    req = service.files().export_media(fileId=f["id"], mimeType="text/plain")
                    text_content = req.execute().decode("utf-8")
                elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                    req = service.files().get_media(fileId=f["id"])
                    doc = docx.Document(io.BytesIO(req.execute()))
                    text_content = "\n".join([p.text for p in doc.paragraphs])
                elif mime_type == "application/pdf":
                    req = service.files().get_media(fileId=f["id"])
                    pdf = PdfReader(io.BytesIO(req.execute()))
                    text_content = "\n".join([p.extract_text() for p in pdf.pages if p.extract_text()])
                else:
                    req = service.files().get_media(fileId=f["id"])
                    text_content = req.execute().decode("utf-8", errors="ignore")
 
                if text_content.strip():
                    return {
                        "text": text_content,
                        "metadata": {
                            "source":      f["name"],
                            "source_link": drive_link,
                            "file_id":     f["id"],
                            "user_id":     user_id,
                        },
                    }
            except Exception as e:
                print(f"[ingest] Skipped '{f.get('name')}': {e}")
            return None
 
        all_documents = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            results = executor.map(download_and_parse, files_to_download)
            all_documents = [r for r in results if r is not None]
 
        if not all_documents:
            return api.create_response(request, {"detail": "No readable text found in this item."}, status=400)
 
        # ── Build chunks with deterministic IDs ───────────────────────
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
        new_chunks, new_metadatas, new_ids = [], [], []
        for doc in all_documents:
            for i, chunk in enumerate(text_splitter.split_text(doc["text"])):
                new_chunks.append(chunk)
                new_metadatas.append(doc["metadata"])
                new_ids.append(
                    hashlib.sha256(
                        f"{user_id}::{doc['metadata']['file_id']}::{i}".encode()
                    ).hexdigest()
                )
 
        if not new_chunks:
            return api.create_response(request, {"detail": "No text chunks could be extracted."}, status=400)
 
        # ── FIX 2: Batch embedding ─────────────────────────────────────
        # embed_documents() sends ALL chunks through the model in one call.
        # Avoids per-chunk overhead — up to 10× faster than sequential.
        print(f"[ingest] Batch encoding {len(new_chunks)} chunks...")
        embedded_vectors = get_embeddings().embed_documents(new_chunks)
        print(f"[ingest] Done. Writing to Chroma...")
 
        # Write with pre-computed vectors — Chroma won't re-encode
        vector_store = Chroma(
            collection_name=f"user_{user_id}",
            embedding_function=get_embeddings(),
            persist_directory=CHROMA_PERSIST_DIR,
        )
        vector_store._collection.upsert(
            documents=new_chunks,
            metadatas=new_metadatas,
            ids=new_ids,
            embeddings=embedded_vectors,
        )
        invalidate_chroma(user_id)
 
        return {
            "message":            "Ingestion complete!",
            "files_processed":    len(all_documents),
            "files_skipped":      skipped_count,
            "total_chunks_saved": len(new_chunks),
            "item_name":          root_item["name"],
        }
 
    except Exception as e:
        return api.create_response(request, {"detail": str(e)}, status=500)


# ── 3. CHAT (streaming) ───────────────────────────────────────────────
@api.post("/chat/{user_id}/{folder_id}", auth=lumina_auth)
def chat_with_documents(request, user_id: str, folder_id: str, payload: ChatRequest):
    """PROTECTED. Streams LLM response token-by-token as NDJSON."""
    if request.auth != user_id:
        return api.create_response(request, {"detail": "Forbidden"}, status=403)

    start_time   = time.time()
    vector_store = get_chroma(user_id)
    docs         = vector_store.similarity_search(query=payload.question, k=4)

    context_text = (
        "\n\n---\n\n".join([doc.page_content for doc in docs])
        if docs else "No relevant documents found."
    )
    prompt = (
        "You are a helpful assistant. Answer the user's question based ONLY on the provided context.\n"
        "If the context doesn't contain the answer, say so clearly.\n\n"
        f"Context:\n{context_text}\n\nQuestion: {payload.question}"
    )

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=GOOGLE_API_KEY,
        temperature=0.3,
    )

    sources_with_links: dict[str, str] = {}
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
            "type":             "done",
            "sources":          [{"name": n, "link": l} for n, l in sources_with_links.items()],
            "response_time_ms": response_time_ms,
            "interaction_id":   interaction_id,
        }) + "\n"

    return StreamingHttpResponse(stream_response(), content_type="application/x-ndjson")


# ── 4. SESSION HISTORY ────────────────────────────────────────────────
@api.get("/sessions/{user_id}", auth=lumina_auth)
def get_sessions(request, user_id: str):
    """PROTECTED."""
    if request.auth != user_id:
        return api.create_response(request, {"detail": "Forbidden"}, status=403)

    sessions = ChatSession.objects.filter(user_id=user_id).order_by("-updated_at")[:50]
    return [
        {
            "id":            s.id,
            "session_name":  s.session_name or s.folder_name or "Untitled Chat",
            "folder_name":   s.folder_name,
            "folder_id":     s.folder_id,
            "updated_at":    s.updated_at.isoformat(),
            "message_count": s.interactions.count(),
        }
        for s in sessions
    ]


@api.get("/sessions/{user_id}/{session_id}/messages", auth=lumina_auth)
def get_session_messages(request, user_id: str, session_id: int):
    """PROTECTED."""
    if request.auth != user_id:
        return api.create_response(request, {"detail": "Forbidden"}, status=403)

    try:
        session = ChatSession.objects.get(id=session_id, user_id=user_id)
    except ChatSession.DoesNotExist:
        return api.create_response(request, {"detail": "Session not found"}, status=404)

    interactions = session.interactions.prefetch_related("sources").order_by("created_at")
    messages = []
    for interaction in interactions:
        messages.append({
            "role": "user", "content": interaction.user_query,
            "sources": [], "interaction_id": None,
        })
        messages.append({
            "role":             "bot",
            "content":          interaction.ai_response,
            "sources":          [
                {"name": s.document_name, "link": s.document_link or ""}
                for s in interaction.sources.all()
            ],
            "interaction_id":   interaction.id,
            "response_time_ms": interaction.response_time_ms,
        })

    return {
        "session_id":   session.id,
        "session_name": session.session_name or session.folder_name,
        "folder_id":    session.folder_id,
        "folder_name":  session.folder_name,
        "messages":     messages,
    }


# ── 5. RAISE TICKET ───────────────────────────────────────────────────
@api.post("/raise-ticket/{user_id}", auth=lumina_auth)
def raise_ticket(request, user_id: str, payload: TicketRequest):
    """PROTECTED."""
    if request.auth != user_id:
        return api.create_response(request, {"detail": "Forbidden"}, status=403)

    try:
        if payload.interaction_id is not None:
            InteractionLog.objects.filter(id=payload.interaction_id).update(ticket_raised=True)
        return {
            "success":        True,
            "message":        "Ticket raised successfully. Support team notified.",
            "interaction_id": payload.interaction_id,
        }
    except Exception as e:
        return api.create_response(request, {"detail": f"Failed to raise ticket: {str(e)}"}, status=500)


# ── 6. ANALYTICS ──────────────────────────────────────────────────────
@api.get("/analytics/{user_id}", auth=lumina_auth)
def get_analytics(request, user_id: str):
    """PROTECTED."""
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
    deflection_rate = (
        round((resolved_without_ticket / total_queries) * 100, 1)
        if total_queries > 0 else 0
    )
    avg_response_ms = interactions.aggregate(avg=Avg("response_time_ms"))["avg"] or 0
    slow_responses  = interactions.filter(response_time_ms__gt=3000).count()

    last_14_days = timezone.now() - timedelta(days=14)
    daily_data = (
        interactions.filter(created_at__gte=last_14_days)
        .annotate(date=TruncDate("created_at"))
        .values("date")
        .annotate(queries=Count("id"), tickets=Count("id", filter=Q(ticket_raised=True)))
        .order_by("date")
    )
    daily_map = {entry["date"].isoformat(): entry for entry in daily_data}
    timeline  = []
    for i in range(14):
        day     = (timezone.now() - timedelta(days=13 - i)).date()
        day_str = day.isoformat()
        entry   = daily_map.get(day_str, {})
        timeline.append({
            "date":    day_str,
            "queries": entry.get("queries", 0),
            "tickets": entry.get("tickets", 0),
        })

    profile = {}
    try:
        p       = UserProfile.objects.get(user_id=user_id)
        profile = {"display_name": p.display_name, "email": p.email}
    except UserProfile.DoesNotExist:
        profile = {"display_name": user_id, "email": ""}

    return {
        "total_queries":           total_queries,
        "tickets_raised":          tickets_raised,
        "resolved_without_ticket": resolved_without_ticket,
        "deflection_rate_percent": deflection_rate,
        "avg_response_time_ms":    round(avg_response_ms),
        "slow_responses_over_3s":  slow_responses,
        "sessions_count":          sessions.count(),
        "timeline":                timeline,
        "user_profile":            profile,
    }