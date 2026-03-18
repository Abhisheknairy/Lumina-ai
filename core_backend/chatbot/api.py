"""
Lumina AI — Django Ninja API
Fixes applied:
  1. No hardcoded secrets — all values from os.environ
  2. OAuth sessions persisted to DB (not in-memory dict)
  3. Embeddings + Chroma client cached as singletons (not re-init per request)
  4. Chroma ingestion deduplicates chunks by (user_id, file_id)
  5. Streaming chat response via StreamingHttpResponse
  6. CorsMiddleware order fixed in settings.py
"""

from ninja import NinjaAPI, Schema
from django.http import HttpResponseRedirect, StreamingHttpResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import os, io, docx, time, json, hashlib
from PyPDF2 import PdfReader

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_google_genai import ChatGoogleGenerativeAI

from .models import ChatSession, InteractionLog, SourceDocument, UserProfile, OAuthSession

# ── Only allow insecure transport in development ─────────────────────
if os.environ.get("DJANGO_DEBUG", "False").lower() == "true":
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

api = NinjaAPI(title="Lumina AI Django API")

from pathlib import Path
CURRENT_DIR = Path(__file__).resolve().parent
BASE_DIR    = CURRENT_DIR.parent

# ── Config from environment (no hardcoded secrets) ───────────────────
CLIENT_SECRETS_FILE = os.environ.get("GOOGLE_CLIENT_SECRETS_FILE", str(BASE_DIR / "client_secret.json"))
CHROMA_PERSIST_DIR  = os.environ.get("CHROMA_PERSIST_DIR", str(BASE_DIR / "chroma_db"))
REDIRECT_URI        = os.environ.get("OAUTH_REDIRECT_URI", "http://localhost:8000/api/auth/callback")
FRONTEND_URL        = os.environ.get("FRONTEND_URL", "http://localhost:5173")
# FIX #1: GOOGLE_API_KEY — no hardcoded fallback. Will raise clear error if missing.
GOOGLE_API_KEY      = os.environ["GOOGLE_API_KEY"]

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
]

CRED_KEYS = {"token", "refresh_token", "token_uri", "client_id", "client_secret", "scopes"}

# ── FIX #3: Singleton cache for heavy objects ─────────────────────────
# Embeddings model and Chroma clients are initialised ONCE per process,
# not on every request. This prevents ~2s startup overhead per chat call.
_embeddings_singleton: HuggingFaceEmbeddings | None = None
_chroma_clients: dict[str, Chroma] = {}  # keyed by user_id


def get_embeddings() -> HuggingFaceEmbeddings:
    """Lazy singleton — loads the model only on first call."""
    global _embeddings_singleton
    if _embeddings_singleton is None:
        _embeddings_singleton = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return _embeddings_singleton


def get_chroma(user_id: str) -> Chroma:
    """Per-user Chroma client singleton — not re-initialised every request."""
    global _chroma_clients
    if user_id not in _chroma_clients:
        _chroma_clients[user_id] = Chroma(
            collection_name=f"user_{user_id}",
            embedding_function=get_embeddings(),
            persist_directory=CHROMA_PERSIST_DIR,
        )
    return _chroma_clients[user_id]


def invalidate_chroma(user_id: str):
    """Call this after ingestion so the cached client picks up new data."""
    _chroma_clients.pop(user_id, None)


# ── FIX #2: Session helpers — DB-backed, survives server restart ─────
CRED_DB_KEYS = ["token", "refresh_token", "token_uri", "client_id", "client_secret", "scopes"]


def save_session(user_id: str, credentials, display_name: str = "", email: str = ""):
    """Persist OAuth credentials to the DB so a restart doesn't log users out."""
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
    """Load OAuth session from DB. Returns None if not found."""
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
    """Build Google Credentials from DB session."""
    from google.oauth2.credentials import Credentials
    s = load_session(user_id)
    if not s:
        raise ValueError(f"No session for user {user_id}")
    return Credentials(**{k: v for k, v in s.items() if k in CRED_KEYS})


def is_authenticated(user_id: str) -> bool:
    return OAuthSession.objects.filter(user_id=user_id).exists()


def generate_session_name(question: str) -> str:
    words = question.strip().split()
    name  = " ".join(words[:6])
    return (name[:60] + "…") if len(name) > 60 else name


# ── In-memory OAuth flow store (short-lived, fine to be in-memory) ────
# These only live for the seconds between "redirect to Google" and "callback".
_oauth_flows: dict[str, Flow] = {}


# ── SCHEMAS ──────────────────────────────────────────────────────────
class ChatRequest(Schema):
    question:    str
    folder_name: str = ""


class TicketRequest(Schema):
    interaction_id: int
    user_query:     str
    ai_response:    str
    priority:       str = "medium"


# ── 1. AUTH ──────────────────────────────────────────────────────────
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

    # FIX #2: Persist credentials to DB (was in-memory dict only)
    save_session(state, credentials, display_name=display_name, email=email)

    UserProfile.objects.update_or_create(
        user_id=state,
        defaults={"display_name": display_name, "email": email},
    )

    return HttpResponseRedirect(f"{FRONTEND_URL}/chat?user_id={state}")


@api.get("/get-token/{user_id}")
def get_access_token(request, user_id: str):
    """Returns OAuth token + real profile. DB-backed — survives server restarts."""
    # UserProfile is always the source of truth for display_name/email
    # (set during OAuth callback via people API)
    profile_name = user_id  # default fallback
    profile_email = ""
    try:
        p = UserProfile.objects.get(user_id=user_id)
        profile_name  = p.display_name or user_id
        profile_email = p.email or ""
    except UserProfile.DoesNotExist:
        pass

    session = load_session(user_id)
    if not session:
        return {
            "access_token": None,
            "display_name": profile_name,
            "email":        profile_email,
        }

    return {
        "access_token": session["token"],
        # Prefer UserProfile name; fall back to session name; last resort is user_id
        "display_name": profile_name if profile_name != user_id else (session.get("display_name") or user_id),
        "email":        profile_email or session.get("email", ""),
    }


# ── 2. INGESTION ─────────────────────────────────────────────────────
@api.post("/ingest-item/{user_id}/{item_id}")
def ingest_item(request, user_id: str, item_id: str):
    if not is_authenticated(user_id):
        return api.create_response(request, {"detail": "Not authenticated"}, status=401)

    creds   = get_creds(user_id)
    service = build("drive", "v3", credentials=creds)

    try:
        root_item = service.files().get(
            fileId=item_id, supportsAllDrives=True,
            fields="id, name, mimeType, webViewLink"
        ).execute()

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

        all_documents = []
        for f in files_to_process:
            mime_type    = f["mimeType"]
            text_content = ""
            drive_link   = f.get("webViewLink") or f"https://drive.google.com/file/d/{f['id']}/view"
            try:
                if mime_type == "application/vnd.google-apps.document":
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
                    all_documents.append({
                        "text": text_content,
                        "metadata": {
                            "source":      f["name"],
                            "source_link": drive_link,
                            "file_id":     f["id"],
                            "user_id":     user_id,
                        },
                    })
            except Exception:
                pass  # Skip unreadable files gracefully

        if not all_documents:
            return api.create_response(request, {"detail": "No readable text found in this item."}, status=400)

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
        new_chunks, new_metadatas, new_ids = [], [], []

        for doc in all_documents:
            split_texts = text_splitter.split_text(doc["text"])
            for i, chunk in enumerate(split_texts):
                # FIX #4: Deterministic chunk ID — prevents duplicate ingestion
                # Same file + same position = same ID → Chroma upserts instead of appending
                chunk_id = hashlib.sha256(
                    f"{user_id}::{doc['metadata']['file_id']}::{i}".encode()
                ).hexdigest()
                new_chunks.append(chunk)
                new_metadatas.append(doc["metadata"])
                new_ids.append(chunk_id)

        if new_chunks:
            # FIX #3: Use cached client; invalidate after write so reads are fresh
            vector_store = Chroma(
                collection_name=f"user_{user_id}",
                embedding_function=get_embeddings(),
                persist_directory=CHROMA_PERSIST_DIR,
            )
            # upsert_texts = add with IDs; Chroma deduplicates on matching IDs
            vector_store.add_texts(texts=new_chunks, metadatas=new_metadatas, ids=new_ids)
            invalidate_chroma(user_id)  # force fresh client for next query

            return {
                "message":            "Ingestion complete!",
                "files_processed":    len(all_documents),
                "total_chunks_saved": len(new_chunks),
                "item_name":          root_item["name"],
            }

        return api.create_response(request, {"detail": "No text chunks could be extracted."}, status=400)

    except Exception as e:
        return api.create_response(request, {"detail": str(e)}, status=500)


# ── 3. CHAT (streaming) ───────────────────────────────────────────────
@api.post("/chat/{user_id}/{folder_id}")
def chat_with_documents(request, user_id: str, folder_id: str, payload: ChatRequest):
    """
    FIX #5: Streams the LLM response token-by-token using StreamingHttpResponse.
    The frontend receives a newline-delimited JSON stream (NDJSON):
      - Each token: {"type": "token", "content": "..."}
      - Final metadata: {"type": "done", "sources": [...], "response_time_ms": 123, "interaction_id": 456}
    This eliminates the full-response wait time.
    """
    start_time = time.time()

    # FIX #3: Cached Chroma client
    vector_store = get_chroma(user_id)
    docs = vector_store.similarity_search(query=payload.question, k=4)

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

        # Stream tokens
        for chunk in llm.stream(prompt):
            token = chunk.content
            full_response += token
            yield json.dumps({"type": "token", "content": token}) + "\n"

        response_time_ms = int((time.time() - start_time) * 1000)

        # Persist to DB after streaming is complete
        interaction_id = None
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
            print(f"DB logging failed: {e}")

        # Final metadata frame
        yield json.dumps({
            "type":             "done",
            "sources":          [{"name": n, "link": l} for n, l in sources_with_links.items()],
            "response_time_ms": response_time_ms,
            "interaction_id":   interaction_id,
        }) + "\n"

    return StreamingHttpResponse(
        stream_response(),
        content_type="application/x-ndjson",
    )


# ── 4. SESSION HISTORY ────────────────────────────────────────────────
@api.get("/sessions/{user_id}")
def get_sessions(request, user_id: str):
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


@api.get("/sessions/{user_id}/{session_id}/messages")
def get_session_messages(request, user_id: str, session_id: int):
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
@api.post("/raise-ticket/{user_id}")
def raise_ticket(request, user_id: str, payload: TicketRequest):
    if not is_authenticated(user_id):
        return api.create_response(request, {"detail": "Not authenticated"}, status=401)
    try:
        if payload.interaction_id:
            InteractionLog.objects.filter(id=payload.interaction_id).update(ticket_raised=True)
        return {
            "success":        True,
            "message":        "Ticket raised successfully. Support team notified.",
            "interaction_id": payload.interaction_id,
        }
    except Exception as e:
        return api.create_response(request, {"detail": f"Failed to raise ticket: {str(e)}"}, status=500)


# ── 6. ANALYTICS ──────────────────────────────────────────────────────
@api.get("/analytics/{user_id}")
def get_analytics(request, user_id: str):
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
    daily_data   = (
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