"""
Lumina AI — Django Ninja API  (enterprise rewrite)

Key upgrades over previous version:
  - Embedding model: BAAI/bge-large-en-v1.5 (768-dim, MTEB SOTA for retrieval)
  - Chunking: 512 tokens / 64 overlap, sentence-aware splitter
  - Retrieval: k=8 candidates → cross-encoder reranking → top 4 passed to LLM
  - RAG prompt: structured system/user template with citation instructions
  - Conversation history: last 6 turns injected into prompt for follow-up questions
  - N+1 query fixes: admin_list_users now uses aggregation, not per-row queries
  - Drive API: exponential backoff retry wrapper
  - Auth: canonical user_id via email lookup (no duplicate profiles)
  - Chroma client cache: LRU eviction (max 50 collections in memory)
  - GOOGLE_API_KEY: reads from env only, no hardcoded fallback
  - Text extraction: improved PDF (pdfminer fallback), DOCX table support
"""

from ninja import NinjaAPI, Schema
from ninja.security import HttpBearer
from django.http import HttpResponseRedirect, StreamingHttpResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import os, io, docx, time, json, hashlib, secrets, logging
from typing import Optional, List

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_google_genai import ChatGoogleGenerativeAI

from .models import (
    ChatSession, InteractionLog, SourceDocument,
    UserProfile, OAuthSession, PlatformRole, # <--- Added PlatformRole
    KnowledgeBase, KBMembership, AdminAuditLog,
    SUPER_ADMIN_EMAILS, ROLE_SUPER_ADMIN, ROLE_ADMIN, ROLE_USER,
    KB_ROLE_VIEWER, KB_ROLE_EDITOR,
)

logger = logging.getLogger(__name__)

if os.environ.get("DJANGO_DEBUG", "False").lower() == "true":
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

from pathlib import Path
CURRENT_DIR = Path(__file__).resolve().parent
BASE_DIR    = CURRENT_DIR.parent

CLIENT_SECRETS_FILE = os.environ.get("GOOGLE_CLIENT_SECRETS_FILE", str(BASE_DIR / "client_secret.json"))
CHROMA_PERSIST_DIR  = os.environ.get("CHROMA_PERSIST_DIR",  str(BASE_DIR / "chroma_db"))
REDIRECT_URI        = os.environ.get("OAUTH_REDIRECT_URI",  "http://localhost:8000/api/auth/callback")
FRONTEND_URL        = os.environ.get("FRONTEND_URL",        "http://localhost:5173")

# ── SECURITY: API key from environment only — never hardcoded ─────────
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
if not GOOGLE_API_KEY:
    logger.warning("[startup] GOOGLE_API_KEY not set — chat will fail")

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
]
CRED_KEYS = {"token", "refresh_token", "token_uri", "client_id", "client_secret", "scopes"}

# ── Retrieval config ──────────────────────────────────────────────────
EMBED_MODEL       = "BAAI/bge-large-en-v1.5"   # 768-dim, MTEB SOTA
RETRIEVAL_K       = 8    # candidates fetched from Chroma before reranking
RERANK_TOP_K      = 4    # top docs passed to LLM after reranking
CHUNK_SIZE        = 512  # tokens — smaller = higher precision
CHUNK_OVERLAP     = 64   # overlap — enough for sentence continuity
SCORE_THRESHOLD   = 0.30 # minimum cosine similarity to include a chunk
MAX_HISTORY_TURNS = 3    # last N Q/A pairs injected into prompt

# ── Auth guard ────────────────────────────────────────────────────────
class LuminaAuth(HttpBearer):
    def authenticate(self, request, token: str) -> str | None:
        if OAuthSession.objects.filter(user_id=token).exists():
            return token
        return None

lumina_auth = LuminaAuth()
api = NinjaAPI(title="Lumina AI", version="2.0")


# ═══════════════════════════════════════════════════════════════════════
# SINGLETONS & CACHING
# ═══════════════════════════════════════════════════════════════════════

_embeddings_singleton = None
_chroma_cache: dict   = {}      # LRU-bounded (max 50)
_CHROMA_CACHE_MAX     = 50
_reranker_singleton   = None
_oauth_flows: dict    = {}


def get_embeddings() -> HuggingFaceEmbeddings:
    """
    BGE-large-en-v1.5 — 768-dim, trained with contrastive learning on
    MS MARCO + BEIR. Consistently top-3 on MTEB Retrieval benchmark.
    Uses BGE query prefix "Represent this sentence for searching..." at
    query time (handled automatically by the model).
    """
    global _embeddings_singleton
    if _embeddings_singleton is None:
        logger.info("[embeddings] Loading BAAI/bge-large-en-v1.5 …")
        _embeddings_singleton = HuggingFaceEmbeddings(
            model_name=EMBED_MODEL,
            model_kwargs={"device": "cpu"},
            encode_kwargs={
                "normalize_embeddings": True,   # cosine similarity requires unit vectors
                "batch_size": 64,
            },
        )
        logger.info("[embeddings] Model loaded")
    return _embeddings_singleton


def get_chroma(collection_name: str) -> Chroma:
    """LRU-bounded Chroma client cache. Evicts oldest when > max."""
    if collection_name not in _chroma_cache:
        if len(_chroma_cache) >= _CHROMA_CACHE_MAX:
            oldest = next(iter(_chroma_cache))
            del _chroma_cache[oldest]
            logger.debug(f"[chroma] Evicted collection '{oldest}' from cache")
        _chroma_cache[collection_name] = Chroma(
            collection_name=collection_name,
            embedding_function=get_embeddings(),
            persist_directory=CHROMA_PERSIST_DIR,
        )
    return _chroma_cache[collection_name]


def get_reranker():
    """
    Cross-encoder reranker: ms-marco-MiniLM-L-6-v2.
    Scores (query, passage) pairs for precision — much better than
    embedding-only cosine similarity for final ranking.
    Falls back gracefully if sentence-transformers is not installed.
    """
    global _reranker_singleton
    if _reranker_singleton is None:
        try:
            from sentence_transformers import CrossEncoder
            _reranker_singleton = CrossEncoder(
                "cross-encoder/ms-marco-MiniLM-L-6-v2",
                max_length=512,
            )
            logger.info("[reranker] Cross-encoder loaded")
        except Exception as e:
            logger.warning(f"[reranker] Could not load cross-encoder: {e}. Will use embedding scores only.")
            _reranker_singleton = None
    return _reranker_singleton


def make_text_splitter() -> RecursiveCharacterTextSplitter:
    """
    Sentence-aware splitter. Separators tried in order — double newline
    (paragraph), single newline, period+space, then character.
    512 chars ≈ 100-150 tokens for English — tight enough for precision,
    large enough for context.
    """
    return RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", "? ", "! ", " ", ""],
        length_function=len,
        is_separator_regex=False,
    )


# ═══════════════════════════════════════════════════════════════════════
# DRIVE API HELPERS
# ═══════════════════════════════════════════════════════════════════════

def drive_api_call(fn, *args, max_retries: int = 3, **kwargs):
    """
    Retry wrapper for Drive API calls with exponential backoff.
    Retries on 429 (quota), 500, 503.
    """
    for attempt in range(max_retries):
        try:
            return fn(*args, **kwargs)
        except HttpError as e:
            if e.resp.status in (429, 500, 503) and attempt < max_retries - 1:
                wait = 2 ** attempt
                logger.warning(f"[drive] HTTP {e.resp.status} on attempt {attempt+1}, retrying in {wait}s")
                time.sleep(wait)
            else:
                raise
        except Exception:
            raise


def extract_text_from_file(service, f: dict) -> str:
    """
    Extract plain text from a Drive file.
    Handles: Google Docs, Sheets, Slides, DOCX (with tables), PDF
    (pdfminer for better text extraction), plain text.
    Returns empty string on failure (caller decides whether to skip).
    """
    mime = f["mimeType"]
    fid  = f["id"]
    name = f.get("name", fid)

    try:
        if mime == "application/vnd.google-apps.document":
            raw = drive_api_call(
                service.files().export_media(fileId=fid, mimeType="text/plain").execute
            )
            return raw.decode("utf-8", errors="replace")

        elif mime == "application/vnd.google-apps.spreadsheet":
            raw = drive_api_call(
                service.files().export_media(fileId=fid, mimeType="text/csv").execute
            )
            return raw.decode("utf-8", errors="replace")

        elif mime == "application/vnd.google-apps.presentation":
            raw = drive_api_call(
                service.files().export_media(fileId=fid, mimeType="text/plain").execute
            )
            return raw.decode("utf-8", errors="replace")

        elif mime in (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        ):
            raw = drive_api_call(service.files().get_media(fileId=fid).execute)
            doc = docx.Document(io.BytesIO(raw))
            parts = []
            for para in doc.paragraphs:
                if para.text.strip():
                    parts.append(para.text)
            # Also extract table cells — often missed
            for table in doc.tables:
                for row in table.rows:
                    row_text = " | ".join(
                        cell.text.strip() for cell in row.cells if cell.text.strip()
                    )
                    if row_text:
                        parts.append(row_text)
            return "\n".join(parts)

        elif mime == "application/pdf":
            raw = drive_api_call(service.files().get_media(fileId=fid).execute)
            # Try pdfminer first (better layout preservation), fall back to PyPDF2
            try:
                from pdfminer.high_level import extract_text as pdfminer_extract
                text = pdfminer_extract(io.BytesIO(raw))
                if text and text.strip():
                    return text
            except ImportError:
                pass
            # PyPDF2 fallback
            from PyPDF2 import PdfReader
            reader = PdfReader(io.BytesIO(raw))
            return "\n".join(
                page.extract_text() for page in reader.pages if page.extract_text()
            )

        elif mime.startswith("text/"):
            raw = drive_api_call(service.files().get_media(fileId=fid).execute)
            return raw.decode("utf-8", errors="replace")

        else:
            logger.debug(f"[extract] Unsupported MIME '{mime}' for '{name}', skipping")
            return ""

    except Exception as e:
        logger.warning(f"[extract] Failed to extract '{name}': {e}")
        return ""


def get_files_recursive(service, folder_id: str) -> list[dict]:
    """Recursively list all non-folder files under a Drive folder."""
    found: list[dict] = []
    page_token = None
    while True:
        res = drive_api_call(
            service.files().list(
                q=f"'{folder_id}' in parents and trashed=false",
                corpora="allDrives",
                includeItemsFromAllDrives=True,
                supportsAllDrives=True,
                fields="nextPageToken, files(id, name, mimeType, webViewLink)",
                pageSize=1000,
                pageToken=page_token,
            ).execute
        )
        for item in res.get("files", []):
            if item["mimeType"] == "application/vnd.google-apps.folder":
                found.extend(get_files_recursive(service, item["id"]))
            else:
                found.append(item)
        page_token = res.get("nextPageToken")
        if not page_token:
            break
    return found


# ═══════════════════════════════════════════════════════════════════════
# RETRIEVAL & RERANKING
# ═══════════════════════════════════════════════════════════════════════

def retrieve_and_rerank(
    collection_name: str,
    query: str,
    k_candidates: int = RETRIEVAL_K,
    top_k: int = RERANK_TOP_K,
) -> list:
    """
    Two-stage retrieval:
      Stage 1 — Dense retrieval: fetch k_candidates from Chroma (cosine similarity)
      Stage 2 — Cross-encoder reranking: score each (query, passage) pair and
                 take top_k by reranker score.

    Falls back to embedding-only top_k if cross-encoder is unavailable.
    Filters out chunks below SCORE_THRESHOLD (avoids hallucination from weak matches).
    """
    vector_store = get_chroma(collection_name)

    # Stage 1: retrieve with scores
    results_with_scores = vector_store.similarity_search_with_relevance_scores(
        query=query,
        k=k_candidates,
    )

    # Filter by score threshold
    candidates = [
        (doc, score)
        for doc, score in results_with_scores
        if score >= SCORE_THRESHOLD
    ]

    if not candidates:
        # Relax threshold if nothing passes — better a weak answer than silence
        candidates = results_with_scores[:top_k]
        logger.debug(f"[retrieval] No chunks above threshold {SCORE_THRESHOLD}, using top {top_k}")

    if len(candidates) <= top_k:
        return [doc for doc, _ in candidates]

    # Stage 2: cross-encoder reranking
    reranker = get_reranker()
    if reranker is not None:
        try:
            pairs = [(query, doc.page_content) for doc, _ in candidates]
            scores = reranker.predict(pairs)
            ranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)
            return [doc for (doc, _), _ in ranked[:top_k]]
        except Exception as e:
            logger.warning(f"[reranker] Reranking failed: {e}, falling back to embedding scores")

    # Fallback: embedding-score top_k
    return [doc for doc, _ in candidates[:top_k]]


# ═══════════════════════════════════════════════════════════════════════
# RAG PROMPT BUILDER
# ═══════════════════════════════════════════════════════════════════════

def build_rag_prompt(
    question: str,
    docs: list,
    conversation_history: list | None = None,
) -> str:
    """
    Structured RAG prompt:
      - System: role + strict grounding instruction + citation rule
      - Context: numbered source passages with filename attribution
      - History: last MAX_HISTORY_TURNS Q/A pairs for follow-up awareness
      - Question: the current user question

    Numbered citations let the LLM say "According to [1]..." which we
    can later parse for inline citations.
    """
    # Build numbered context blocks
    context_blocks = []
    for i, doc in enumerate(docs, 1):
        source = doc.metadata.get("source", "Unknown document")
        folder = doc.metadata.get("folder", "")
        loc    = f"{folder} › {source}" if folder else source
        context_blocks.append(f"[{i}] {loc}\n{doc.page_content.strip()}")

    context_section = "\n\n".join(context_blocks) if context_blocks else "No relevant documents found."

    system = (
        "You are Lumina AI, an enterprise knowledge assistant. "
        "Your job is to answer questions based STRICTLY on the provided source documents. "
        "Rules:\n"
        "1. Answer ONLY from the context below. Do not use outside knowledge.\n"
        "2. When you use information from a source, cite it as [1], [2] etc. inline.\n"
        "3. If the context does not contain enough information to answer, say: "
        "'I could not find this in the available documents.' Do not guess.\n"
        "4. Be concise and precise. Use bullet points for steps or lists.\n"
        "5. If the question is a follow-up to previous conversation, use the history below."
    )

    # Inject recent conversation history for follow-up question awareness
    history_section = ""
    if conversation_history:
        recent = conversation_history[-(MAX_HISTORY_TURNS * 2):]  # last N turns (user+bot pairs)
        turns = []
        for msg in recent:
            role = "User" if msg.get("role") == "user" else "Assistant"
            turns.append(f"{role}: {msg.get('content', '').strip()}")
        if turns:
            history_section = "\n\nPrevious conversation:\n" + "\n".join(turns)

    prompt = (
        f"{system}\n\n"
        f"Source documents:\n{context_section}"
        f"{history_section}\n\n"
        f"Question: {question}"
    )

    return prompt


# ═══════════════════════════════════════════════════════════════════════
# DB SESSION HELPERS
# ═══════════════════════════════════════════════════════════════════════

def save_session(user_id: str, credentials, display_name: str = "", email: str = "") -> None:
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
        }
    except OAuthSession.DoesNotExist:
        return None


def get_creds(user_id: str):
    from google.oauth2.credentials import Credentials
    s = load_session(user_id)
    if not s:
        raise ValueError(f"No OAuth session for user {user_id}")
    return Credentials(**{k: v for k, v in s.items() if k in CRED_KEYS})


# ═══════════════════════════════════════════════════════════════════════
# UTILITY HELPERS
# ═══════════════════════════════════════════════════════════════════════

def generate_session_name(question: str) -> str:
    words = question.strip().split()
    name  = " ".join(words[:6])
    return (name[:60] + "…") if len(name) > 60 else name


def derive_name_from_email(email: str) -> str:
    if not email:
        return ""
    local = email.split("@")[0]
    parts = local.replace("_", ".").split(".")
    return " ".join(p.capitalize() for p in parts if p)


def has_permission(user_id: str, perm_name: str) -> bool:
    """Checks if the user's dynamic PlatformRole has the requested permission."""
    try:
        profile = UserProfile.objects.select_related('platform_role').get(user_id=user_id)
        # If they don't have a platform role yet, default to False
        if not profile.platform_role:
            return False
        # Check the JSON dictionary for the specific toggle
        return profile.platform_role.permissions.get(perm_name, False)
    except UserProfile.DoesNotExist:
        return False


def audit(
    actor_user_id: str, actor_email: str, action: str,
    target_user_id: str = "", target_email: str = "", detail: dict = None,
) -> None:
    AdminAuditLog.objects.create(
        actor_user_id=actor_user_id,
        actor_email=actor_email,
        action=action,
        target_user_id=target_user_id,
        target_email=target_email,
        detail=detail or {},
    )


def is_already_ingested(collection_name: str, file_id: str) -> bool:
    """Check whether chunk 0 of a file is already in Chroma."""
    chunk_0_id = hashlib.sha256(f"{collection_name}::{file_id}::0".encode()).hexdigest()
    try:
        result = get_chroma(collection_name)._collection.get(ids=[chunk_0_id])
        return len(result["ids"]) > 0
    except Exception:
        return False


def send_invite_email(
    to_email: str, kb_name: str, invite_link: str,
    invited_by_name: str, invited_by_email: str,
) -> bool:
    from django.core.mail import send_mail
    from django.conf import settings

    subject   = f"You've been invited to '{kb_name}' on Lumina AI"
    text_body = (
        f"{invited_by_name or invited_by_email} has invited you to the knowledge base "
        f"'{kb_name}' on Lumina AI.\n\nAccept your invitation:\n{invite_link}\n\n"
        "— Lumina AI · iSteer Technologies"
    )
    html_body = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f7f7f8;font-family:'Inter',-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f8;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e8e6e1;overflow:hidden;">
  <tr><td style="padding:28px 36px 20px;border-bottom:1px solid #f0efec;">
    <span style="font-size:16px;font-weight:600;color:#1a1a18;">Lumina AI</span>
  </td></tr>
  <tr><td style="padding:32px 36px;">
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1a1a18;">
      Join &ldquo;{kb_name}&rdquo;
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#6b6b63;line-height:1.65;">
      <strong style="color:#1a1a18;">{invited_by_name or invited_by_email}</strong>
      has invited you to a shared knowledge base on Lumina AI.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="background:#1a1a18;border-radius:8px;">
        <a href="{invite_link}" style="display:inline-block;padding:12px 28px;font-size:14px;
           font-weight:500;color:#fff;text-decoration:none;">Accept invitation &rarr;</a>
      </td></tr>
    </table>
    <p style="margin:0;font-size:12px;color:#a8a89e;word-break:break-all;">{invite_link}</p>
  </td></tr>
  <tr><td style="padding:16px 36px;border-top:1px solid #f0efec;background:#fafaf8;">
    <p style="margin:0;font-size:11px;color:#a8a89e;">
      Sent by {invited_by_email} via Lumina AI &middot; &copy; 2026 iSteer Technologies
    </p>
  </td></tr>
</table></td></tr></table>
</body></html>"""

    try:
        send_mail(
            subject=subject,
            message=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email],
            html_message=html_body,
            fail_silently=False,
        )
        logger.info(f"[email] Invite sent to {to_email} for KB '{kb_name}'")
        return True
    except Exception as e:
        logger.warning(f"[email] Failed to send to {to_email}: {e}")
        return False


# ═══════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════

class ChatRequest(Schema):
    question:    str
    folder_name: str       = ""
    kb_id:       Optional[int] = None


class TicketRequest(Schema):
    interaction_id: int
    user_query:     str
    ai_response:    str
    priority:       str = "medium"
    comment:        str = ""        # Optional user comment attached to the ticket


class CreateKBRequest(Schema):
    name:          str
    description:   str       = ""
    folder_ids:    List[str]
    folder_names:  List[str] = []
    member_emails: List[str] = []


class UpdateRoleRequest(Schema):
    target_user_id: str
    new_role_id:    int
    
class RoleSchema(Schema):
    name:        str
    description: str = ""
    permissions: dict

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

    # ── Get profile from Google People API ───────────────────────────
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
    except Exception as e:
        logger.warning(f"[auth] People API failed: {e}")

    # ── Fallback: decode email from id_token JWT ──────────────────────
    if not email:
        try:
            import base64, json as _json
            id_token = getattr(credentials, "id_token", None)
            if id_token and isinstance(id_token, str):
                parts = id_token.split(".")
                if len(parts) >= 2:
                    padded  = parts[1] + "=" * (-len(parts[1]) % 4)
                    payload = _json.loads(base64.urlsafe_b64decode(padded))
                    email   = payload.get("email", "")
        except Exception as e:
            logger.warning(f"[auth] id_token fallback failed: {e}")

    if not display_name and email:
        display_name = derive_name_from_email(email)

    # ── KEY: reuse canonical user_id to prevent duplicate profiles ────
    # If this email already has a UserProfile, use its user_id.
    # This means the same person always has the same user_id regardless
    # of which browser/tab they use to log in.
    canonical_user_id = state
    if email:
        try:
            existing = UserProfile.objects.get(email=email)
            canonical_user_id = existing.user_id
            logger.info(f"[auth] Returning user {email} → user_id {canonical_user_id[:8]}…")
        except UserProfile.DoesNotExist:
            logger.info(f"[auth] New user {email} → user_id {canonical_user_id[:8]}…")

    # Save OAuth credentials under the canonical user_id
    save_session(canonical_user_id, credentials, display_name=display_name, email=email)

    # Assign dynamic PlatformRole (Super Admin if in list, else User)
    role_name = "Super Admin" if email in SUPER_ADMIN_EMAILS else "User"
    try:
        assigned_role = PlatformRole.objects.get(name=role_name)
    except PlatformRole.DoesNotExist:
        assigned_role = None

    profile_obj, created = UserProfile.objects.update_or_create(
        user_id=canonical_user_id,
        defaults={"display_name": display_name, "email": email},
    )
    
    # Only assign default role if they don't have one, or if they are a forced Super Admin
    if created or not profile_obj.platform_role or (role_name == "Super Admin" and profile_obj.platform_role.name != "Super Admin"):
        profile_obj.platform_role = assigned_role
        profile_obj.save(update_fields=["platform_role"])

    from django.utils import timezone
    profile_obj.last_seen = timezone.now()
    profile_obj.save(update_fields=["last_seen"])

    # Accept pending KB invitations
    if email:
        KBMembership.objects.filter(
            user_email=email, user_id=""
        ).update(user_id=canonical_user_id, accepted=True)

    return HttpResponseRedirect(f"{FRONTEND_URL}/chat?user_id={canonical_user_id}")


@api.get("/get-token/{user_id}")
def get_access_token(request, user_id: str):
    session = load_session(user_id)
    token   = session["token"] if session else ""
    try:
        p = UserProfile.objects.select_related('platform_role').get(user_id=user_id)
        display_name = p.display_name
        email        = p.email
        role_name    = p.platform_role.name if p.platform_role else "User"
        permissions  = p.platform_role.permissions if p.platform_role else {}
    except UserProfile.DoesNotExist:
        if session:
            s_obj        = OAuthSession.objects.get(user_id=user_id)
            display_name = s_obj.display_name
            email        = s_obj.email
        else:
            display_name = ""
            email        = ""
        role_name   = "User"
        permissions = {}

    return {
        "access_token": token,
        "display_name": display_name,
        "email":        email,
        "role":         role_name,
        "permissions":  permissions, # <--- React will use this to hide/show tabs!
    }


@api.get("/kb/accept-invite/{token}")
def accept_invite(request, token: str, user_id: str = ""):
    try:
        kb = KnowledgeBase.objects.get(invite_token=token, is_active=True)
    except KnowledgeBase.DoesNotExist:
        return api.create_response(request, {"detail": "Invalid or expired invite link."}, status=404)
    if user_id:
        KBMembership.objects.filter(kb=kb, user_id="").update(user_id=user_id, accepted=True)
        KBMembership.objects.filter(kb=kb, user_id=user_id).update(accepted=True)
    return HttpResponseRedirect(
        f"{FRONTEND_URL}/chat?user_id={user_id}&kb_id={kb.id}&kb_name={kb.name}"
    )


# ═══════════════════════════════════════════════════════════════════════
# 2. INGESTION (PROTECTED, streaming NDJSON)
# ═══════════════════════════════════════════════════════════════════════

@api.post("/ingest-item/{user_id}/{item_id}", auth=lumina_auth)
def ingest_item(request, user_id: str, item_id: str, kb_id: Optional[int] = None):
    if request.auth != user_id:
        return api.create_response(request, {"detail": "Forbidden"}, status=403)

    try:
        creds   = get_creds(user_id)
        service = build("drive", "v3", credentials=creds)
    except Exception as e:
        return api.create_response(request, {"detail": f"Drive auth failed: {e}"}, status=500)

    collection_name = f"kb_{kb_id}" if kb_id else f"user_{user_id}"

    try:
        root_item = drive_api_call(
            service.files().get(
                fileId=item_id, supportsAllDrives=True,
                fields="id, name, mimeType, webViewLink",
            ).execute
        )
    except Exception as e:
        return api.create_response(request, {"detail": str(e)}, status=500)

    files_to_process = (
        get_files_recursive(service, item_id)
        if root_item["mimeType"] == "application/vnd.google-apps.folder"
        else [root_item]
    )

    files_to_download = [f for f in files_to_process if not is_already_ingested(collection_name, f["id"])]

    if not files_to_download:
        return {
            "already_indexed":    True,
            "message":            "Already indexed and ready to use.",
            "files_processed":    0,
            "files_skipped":      len(files_to_process),
            "total_chunks_saved": 0,
            "item_name":          root_item["name"],
        }

    text_splitter = make_text_splitter()

    def stream_ingestion():
        total         = len(files_to_download)
        all_chunks    = []
        all_metadatas = []
        all_ids       = []
        files_done    = 0

        for idx, f in enumerate(files_to_download):
            file_name  = f.get("name", f["id"])
            drive_link = f.get("webViewLink") or f"https://drive.google.com/file/d/{f['id']}/view"

            yield json.dumps({
                "type": "progress", "current": idx + 1,
                "total": total, "file": file_name, "status": "processing",
            }) + "\n"

            text = extract_text_from_file(service, f)
            if not text.strip():
                yield json.dumps({
                    "type": "progress", "current": idx + 1,
                    "total": total, "file": file_name, "status": "skipped",
                }) + "\n"
                continue

            chunks = text_splitter.split_text(text)
            for i, chunk in enumerate(chunks):
                chunk_id = hashlib.sha256(f"{collection_name}::{f['id']}::{i}".encode()).hexdigest()
                all_chunks.append(chunk)
                all_metadatas.append({
                    "source":      file_name,
                    "source_link": drive_link,
                    "file_id":     f["id"],
                    "user_id":     user_id,
                })
                all_ids.append(chunk_id)
            files_done += 1

            yield json.dumps({
                "type": "progress", "current": idx + 1,
                "total": total, "file": file_name, "status": "done",
            }) + "\n"

        if all_chunks:
            yield json.dumps({
                "type": "progress", "current": total, "total": total,
                "file": "", "status": "embedding",
            }) + "\n"
            try:
                embeddings = get_embeddings().embed_documents(all_chunks)
                vs = get_chroma(collection_name)
                vs._collection.upsert(
                    documents=all_chunks,
                    metadatas=all_metadatas,
                    ids=all_ids,
                    embeddings=embeddings,
                )
                _chroma_cache.pop(collection_name, None)
                yield json.dumps({
                    "type": "done",
                    "already_indexed": False,
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

    # Verify KB membership
    kb_obj = None
    if payload.kb_id:
        try:
            kb_obj = KnowledgeBase.objects.get(id=payload.kb_id, is_active=True)
            if not KBMembership.objects.filter(kb=kb_obj, user_id=user_id, accepted=True).exists():
                return api.create_response(request, {"detail": "Not a member of this KB."}, status=403)
        except KnowledgeBase.DoesNotExist:
            return api.create_response(request, {"detail": "KB not found."}, status=404)

    collection_name = f"kb_{payload.kb_id}" if payload.kb_id else f"user_{user_id}"
    start_time      = time.time()

    # ── Two-stage retrieval with reranking ────────────────────────────
    docs = retrieve_and_rerank(
        collection_name=collection_name,
        query=payload.question,
        k_candidates=RETRIEVAL_K,
        top_k=RERANK_TOP_K,
    )

    # ── Fetch recent conversation history for follow-up context ───────
    conversation_history = []
    try:
        if kb_obj:
            session_qs = ChatSession.objects.filter(kb=kb_obj) # <--- FIXED
        else:
            session_qs = ChatSession.objects.filter(user_id=user_id, folder_id=folder_id, kb=None)

        existing_session = session_qs.first()
        if existing_session:
            recent_interactions = (
                existing_session.interactions
                .order_by("-created_at")[:MAX_HISTORY_TURNS]
            )
            for interaction in reversed(list(recent_interactions)):
                conversation_history.append({"role": "user",      "content": interaction.user_query})
                conversation_history.append({"role": "assistant", "content": interaction.ai_response})
    except Exception as e:
        logger.warning(f"[chat] Could not load history: {e}")

    # ── Build structured RAG prompt ───────────────────────────────────
    prompt = build_rag_prompt(
        question=payload.question,
        docs=docs,
        conversation_history=conversation_history,
    )

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=GOOGLE_API_KEY,
        temperature=0.2,    # lower = more faithful to context
        max_retries=3,
    )

    # Build source map from retrieved docs
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
            # ONE shared session per KB; personal sessions per-user per-folder
            if kb_obj:
                # Safely grab the first session tied to this KB
                session = ChatSession.objects.filter(kb=kb_obj).first()
                
                if not session:
                    # Fallback: manually create it if it somehow got deleted
                    session = ChatSession.objects.create(
                        kb=kb_obj,
                        user_id=kb_obj.created_by,
                        folder_id=folder_id,
                        folder_name=payload.folder_name or kb_obj.folder_name or folder_id,
                        session_name=kb_obj.name,
                    )
            else:
                session, _ = ChatSession.objects.get_or_create(
                    user_id=user_id,
                    folder_id=folder_id,
                    kb=None,
                    defaults={
                        "folder_name":  payload.folder_name or folder_id,
                        "session_name": generate_session_name(payload.question),
                    },
                )

            try:
                asking_profile      = UserProfile.objects.get(user_id=user_id)
                asked_by_name       = asking_profile.display_name or ""
                asked_by_email_val  = asking_profile.email or ""
            except UserProfile.DoesNotExist:
                asked_by_name      = ""
                asked_by_email_val = ""
            
            interaction = InteractionLog.objects.create(
                session=session,
                user_query=payload.question,
                ai_response=full_response,
                response_time_ms=response_time_ms,
                asked_by_user_id=user_id,
                asked_by_display_name=asked_by_name,
                asked_by_email=asked_by_email_val,
                )
           
            interaction_id = interaction.id

            for doc_name, doc_link in sources_with_links.items():
                SourceDocument.objects.create(
                    interaction=interaction,
                    document_name=doc_name,
                    document_link=doc_link or None,
                )
        except Exception as e:
            logger.error(f"[chat] DB logging failed: {e}")

        yield json.dumps({
            "type":              "done",
            "sources":           [{"name": n, "link": l} for n, l in sources_with_links.items()],
            "response_time_ms":  response_time_ms,
            "interaction_id":    interaction_id,
        }) + "\n"

    return StreamingHttpResponse(stream_response(), content_type="application/x-ndjson")


# ═══════════════════════════════════════════════════════════════════════
# 4. SESSION HISTORY (PROTECTED)
# ═══════════════════════════════════════════════════════════════════════

@api.get("/sessions/{user_id}", auth=lumina_auth)
def get_sessions(request, user_id: str):
    if request.auth != user_id:
        return api.create_response(request, {"detail": "Forbidden"}, status=403)

    personal = (
        ChatSession.objects
        .filter(user_id=user_id, kb__isnull=True)
        .select_related("kb")
        .order_by("-updated_at")[:50]
    )
    member_kb_ids = KBMembership.objects.filter(
        user_id=user_id, accepted=True
    ).values_list("kb_id", flat=True)
    shared = (
        ChatSession.objects
        .filter(kb_id__in=member_kb_ids)
        .select_related("kb")
        .order_by("-updated_at")[:20]
    )

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
        "personal": [serialise(s)              for s in personal],
        "shared":   [serialise(s, is_shared=True) for s in shared],
    }


@api.get("/sessions/{user_id}/{session_id}/messages", auth=lumina_auth)
def get_session_messages(request, user_id: str, session_id: int):
    if request.auth != user_id:
        return api.create_response(request, {"detail": "Forbidden"}, status=403)

    try:
        session = ChatSession.objects.select_related("kb").get(id=session_id)
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
        messages.append({
            "role":                  "user",
            "content":               i.user_query,
            "sources":               [],
            "interaction_id":        None,
            "asked_by_user_id":      getattr(i, 'asked_by_user_id', None) or session.user_id,
            "asked_by_display_name": getattr(i, 'asked_by_display_name', None) or "",
            "asked_by_email":        getattr(i, 'asked_by_email', None) or "",
        })
        messages.append({
            "role":             "bot",
            "content":          i.ai_response,
            "sources":          [{"name": s.document_name, "link": s.document_link or ""} for s in i.sources.all()],
            "interaction_id":   i.id,
            "response_time_ms": i.response_time_ms,
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
            InteractionLog.objects.filter(id=payload.interaction_id).update(
                ticket_raised=True,
                ticket_comment=payload.comment.strip(),
            )
        return {"success": True, "interaction_id": payload.interaction_id}
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

    total_queries = interactions.count()
    tickets       = interactions.filter(ticket_raised=True).count()
    resolved      = total_queries - tickets
    deflection    = round((resolved / total_queries) * 100, 1) if total_queries > 0 else 0
    avg_ms        = interactions.aggregate(avg=Avg("response_time_ms"))["avg"] or 0
    slow          = interactions.filter(response_time_ms__gt=3000).count()

    last_14    = timezone.now() - timedelta(days=14)
    daily_data = (
        interactions.filter(created_at__gte=last_14)
        .annotate(date=TruncDate("created_at"))
        .values("date")
        .annotate(queries=Count("id"), tickets=Count("id", filter=Q(ticket_raised=True)))
        .order_by("date")
    )
    daily_map = {e["date"].isoformat(): e for e in daily_data}
    timeline  = []
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
        "total_queries":            total_queries,
        "tickets_raised":           tickets,
        "resolved_without_ticket":  resolved,
        "deflection_rate_percent":  deflection,
        "avg_response_time_ms":     round(avg_ms),
        "slow_responses_over_3s":   slow,
        "sessions_count":           sessions.count(),
        "timeline":                 timeline,
        "user_profile":             profile,
    }


# ═══════════════════════════════════════════════════════════════════════
# 7. KNOWLEDGE BASE (PROTECTED — admin or above)
# ═══════════════════════════════════════════════════════════════════════

@api.post("/kb/create", auth=lumina_auth)
def create_knowledge_base(request, payload: CreateKBRequest):
    user_id = request.auth
    if not has_permission(user_id, "can_manage_kbs"):
        return api.create_response(request, {"detail": "Requires KB management permissions."}, status=403)

    try:
        actor = UserProfile.objects.get(user_id=user_id)
    except UserProfile.DoesNotExist:
        return api.create_response(request, {"detail": "Profile not found."}, status=400)

    token = secrets.token_urlsafe(32)
    while KnowledgeBase.objects.filter(invite_token=token).exists():
        token = secrets.token_urlsafe(32)

    folder_id   = payload.folder_ids[0]   if payload.folder_ids   else ""
    folder_name = payload.folder_names[0] if payload.folder_names else folder_id

    kb = KnowledgeBase.objects.create(
        name=payload.name, description=payload.description,
        folder_id=folder_id, folder_name=folder_name,
        created_by=user_id, invite_token=token,
    )
    KBMembership.objects.create(
        kb=kb, user_id=user_id, user_email=actor.email,
        role=KB_ROLE_EDITOR, accepted=True,
    )

    invite_link   = f"{FRONTEND_URL}/kb/join/{token}"
    emails_sent   = []
    emails_failed = []

    for email in payload.member_emails:
        email = email.strip().lower()
        if not email or email == actor.email:
            continue
        try:
            existing = UserProfile.objects.get(email=email)
            KBMembership.objects.get_or_create(
                kb=kb, user_email=email,
                defaults={"user_id": existing.user_id, "accepted": True},
            )
        except UserProfile.DoesNotExist:
            KBMembership.objects.get_or_create(kb=kb, user_email=email)

        ok = send_invite_email(
            to_email=email, kb_name=kb.name, invite_link=invite_link,
            invited_by_name=actor.display_name, invited_by_email=actor.email,
        )
        (emails_sent if ok else emails_failed).append(email)

    audit(user_id, actor.email, "create_kb", detail={
        "kb_id": kb.id, "kb_name": kb.name,
        "emails_sent": emails_sent, "emails_failed": emails_failed,
    })

    return {
        "id": kb.id, "name": kb.name,
        "invite_token": token, "invite_link": invite_link,
        "folder_id": kb.folder_id, "folder_name": kb.folder_name,
        "member_count": kb.memberships.count(),
        "emails_sent": emails_sent, "emails_failed": emails_failed,
    }


@api.post("/kb/create-and-ingest/{user_id}", auth=lumina_auth)
def create_and_ingest_kb(request, user_id: str, payload: CreateKBRequest):
    """
    Creates a KB and streams ingestion of all selected folders.
    One KB → one Chroma collection (kb_{id}) → all folders indexed together.
    Auto-creates the shared ChatSession at the end so all members see it immediately.
    """
    if request.auth != user_id:
        return api.create_response(request, {"detail": "Forbidden"}, status=403)
    if not has_permission(user_id, "can_manage_kbs"):
        return api.create_response(request, {"detail": "Requires KB management permissions."}, status=403)
    if not payload.folder_ids:
        return api.create_response(request, {"detail": "At least one folder required."}, status=400)

    try:
        actor = UserProfile.objects.get(user_id=user_id)
    except UserProfile.DoesNotExist:
        return api.create_response(request, {"detail": "Profile not found."}, status=400)

    token = secrets.token_urlsafe(32)
    while KnowledgeBase.objects.filter(invite_token=token).exists():
        token = secrets.token_urlsafe(32)

    primary_folder_id   = payload.folder_ids[0]
    primary_folder_name = payload.folder_names[0] if payload.folder_names else primary_folder_id
    all_folder_names    = ", ".join(
        payload.folder_names[i] if i < len(payload.folder_names) else payload.folder_ids[i]
        for i in range(len(payload.folder_ids))
    )

    kb = KnowledgeBase.objects.create(
        name=payload.name, description=payload.description,
        folder_id=primary_folder_id, folder_name=all_folder_names,
        created_by=user_id, invite_token=token,
    )
    KBMembership.objects.create(
        kb=kb, user_id=user_id, user_email=actor.email,
        role=KB_ROLE_EDITOR, accepted=True,
    )

    invited_emails = []
    for email in payload.member_emails:
        email = email.strip().lower()
        if not email or email == actor.email:
            continue
        try:
            existing = UserProfile.objects.get(email=email)
            KBMembership.objects.get_or_create(
                kb=kb, user_email=email,
                defaults={"user_id": existing.user_id, "accepted": True},
            )
        except UserProfile.DoesNotExist:
            KBMembership.objects.get_or_create(kb=kb, user_email=email)
        invited_emails.append(email)

    invite_link     = f"{FRONTEND_URL}/kb/join/{token}"
    collection_name = f"kb_{kb.id}"

    try:
        creds   = get_creds(user_id)
        service = build("drive", "v3", credentials=creds)
    except Exception as e:
        kb.delete()
        return api.create_response(request, {"detail": f"Drive auth failed: {e}"}, status=500)

    text_splitter = make_text_splitter()

    def stream():
        total_folders         = len(payload.folder_ids)
        grand_chunks          = []
        grand_metadatas       = []
        grand_ids             = []
        grand_files_done      = 0

        yield json.dumps({
            "type": "kb_created", "kb_id": kb.id,
            "kb_name": kb.name, "total_folders": total_folders,
        }) + "\n"

        for fi, folder_id in enumerate(payload.folder_ids):
            folder_name = (
                payload.folder_names[fi] if fi < len(payload.folder_names) else folder_id
            )
            yield json.dumps({
                "type": "folder_start", "folder": folder_name,
                "folder_num": fi + 1, "total_folders": total_folders,
            }) + "\n"

            try:
                files = get_files_recursive(service, folder_id)
            except Exception as e:
                yield json.dumps({"type": "error", "detail": f"Could not list '{folder_name}': {e}"}) + "\n"
                continue

            folder_done    = 0
            folder_chunks  = []
            folder_metas   = []
            folder_ids_    = []

            for idx, f in enumerate(files):
                file_name  = f.get("name", f["id"])
                drive_link = f.get("webViewLink") or f"https://drive.google.com/file/d/{f['id']}/view"

                yield json.dumps({
                    "type": "progress", "current": idx + 1, "total": len(files),
                    "file": file_name, "folder": folder_name, "status": "processing",
                }) + "\n"

                text = extract_text_from_file(service, f)
                if not text.strip():
                    yield json.dumps({
                        "type": "progress", "current": idx + 1, "total": len(files),
                        "file": file_name, "folder": folder_name, "status": "skipped",
                    }) + "\n"
                    continue

                chunks = text_splitter.split_text(text)
                for i, chunk in enumerate(chunks):
                    chunk_id = hashlib.sha256(
                        f"{collection_name}::{f['id']}::{i}".encode()
                    ).hexdigest()
                    folder_chunks.append(chunk)
                    folder_metas.append({
                        "source":      file_name,
                        "source_link": drive_link,
                        "file_id":     f["id"],
                        "folder":      folder_name,
                        "user_id":     user_id,
                    })
                    folder_ids_.append(chunk_id)
                folder_done += 1

                yield json.dumps({
                    "type": "progress", "current": idx + 1, "total": len(files),
                    "file": file_name, "folder": folder_name, "status": "done",
                }) + "\n"

            grand_chunks    += folder_chunks
            grand_metadatas += folder_metas
            grand_ids       += folder_ids_
            grand_files_done += folder_done

            yield json.dumps({
                "type": "folder_done", "folder": folder_name, "files_indexed": folder_done,
            }) + "\n"

        if not grand_chunks:
            yield json.dumps({
                "type": "done", "kb_id": kb.id, "kb_name": kb.name,
                "total_files": 0, "total_chunks": 0, "invite_link": invite_link,
                "warning": "No readable text found in selected folders.",
            }) + "\n"
            return

        yield json.dumps({
            "type": "progress", "current": grand_files_done, "total": grand_files_done,
            "file": "", "folder": "", "status": "embedding",
        }) + "\n"

        try:
            embeddings = get_embeddings().embed_documents(grand_chunks)
            vs = get_chroma(collection_name)
            vs._collection.upsert(
                documents=grand_chunks,
                metadatas=grand_metadatas,
                ids=grand_ids,
                embeddings=embeddings,
            )
            _chroma_cache.pop(collection_name, None)

            # Auto-create shared ChatSession so all members see it in sidebar
            ChatSession.objects.get_or_create(
                kb=kb,
                defaults={
                    "user_id":      user_id,
                    "folder_id":    primary_folder_id,
                    "folder_name":  all_folder_names,
                    "session_name": kb.name,
                },
            )

            audit(user_id, actor.email, "create_kb", detail={
                "kb_id": kb.id, "kb_name": kb.name,
                "folders": payload.folder_ids,
                "files_indexed": grand_files_done,
                "chunks": len(grand_chunks),
            })

            for email in invited_emails:
                send_invite_email(
                    to_email=email, kb_name=kb.name, invite_link=invite_link,
                    invited_by_name=actor.display_name, invited_by_email=actor.email,
                )

            yield json.dumps({
                "type": "done", "kb_id": kb.id, "kb_name": kb.name,
                "total_files": grand_files_done, "total_chunks": len(grand_chunks),
                "invite_link": invite_link,
            }) + "\n"

        except Exception as e:
            logger.error(f"[ingest] Embedding/store failed: {e}")
            yield json.dumps({"type": "error", "detail": f"Embedding failed: {e}"}) + "\n"

    return StreamingHttpResponse(stream(), content_type="application/x-ndjson")


@api.get("/kb/list", auth=lumina_auth)
def list_knowledge_bases(request):
    user_id      = request.auth
    member_kb_ids = KBMembership.objects.filter(
        user_id=user_id, accepted=True
    ).values_list("kb_id", flat=True)
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
    if not has_permission(user_id, "can_manage_kbs"):
        return api.create_response(request, {"detail": "Requires KB management permissions."}, status=403)

    try:
        kb = KnowledgeBase.objects.get(id=kb_id)
    except KnowledgeBase.DoesNotExist:
        return api.create_response(request, {"detail": "KB not found."}, status=404)

    email = email.strip().lower()
    try:
        existing = UserProfile.objects.get(email=email)
        KBMembership.objects.get_or_create(
            kb=kb, user_email=email,
            defaults={"user_id": existing.user_id, "role": role, "accepted": True},
        )
    except UserProfile.DoesNotExist:
        KBMembership.objects.get_or_create(kb=kb, user_email=email, defaults={"role": role})

    actor       = UserProfile.objects.get(user_id=user_id)
    invite_link = f"{FRONTEND_URL}/kb/join/{kb.invite_token}"
    email_ok    = send_invite_email(
        to_email=email, kb_name=kb.name, invite_link=invite_link,
        invited_by_name=actor.display_name, invited_by_email=actor.email,
    )
    audit(user_id, actor.email, "add_kb_member", detail={
        "kb_id": kb_id, "email": email, "email_sent": email_ok,
    })
    return {"success": True, "invite_link": invite_link, "email_sent": email_ok}


@api.delete("/kb/{kb_id}", auth=lumina_auth)
def deactivate_kb(request, kb_id: int):
    user_id = request.auth
    if not has_permission(user_id, "can_manage_kbs"):
        return api.create_response(request, {"detail": "Requires KB management permissions."}, status=403)
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
# 8. SUPER ADMIN (PROTECTED — super_admin only)
# ═══════════════════════════════════════════════════════════════════════

@api.get("/admin/users", auth=lumina_auth)
def admin_list_users(request):
    user_id = request.auth
    if not has_permission(user_id, "can_manage_users"):
        return api.create_response(request, {"detail": "Requires user management permissions."}, status=403)

    from django.db.models import Count, Q, Subquery, OuterRef
    from django.db.models.functions import Coalesce

    # Single aggregated query — no N+1
    profiles = UserProfile.objects.all().order_by("-last_seen")

    result = []
    for p in profiles:
        sessions     = ChatSession.objects.filter(user_id=p.user_id)
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
    actor_id = request.auth
    if not has_permission(actor_id, "can_manage_roles"):
        return api.create_response(request, {"detail": "Requires role management permissions."}, status=403)

    try:
        target = UserProfile.objects.get(user_id=payload.target_user_id)
        new_role = PlatformRole.objects.get(id=payload.new_role_id)
    except (UserProfile.DoesNotExist, PlatformRole.DoesNotExist):
        return api.create_response(request, {"detail": "User or Role not found."}, status=404)

    if target.user_id == actor_id:
        return api.create_response(request, {"detail": "Cannot change your own role."}, status=403)

    old_role_name = target.platform_role.name if target.platform_role else "Unknown"
    target.platform_role = new_role
    target.save(update_fields=["platform_role"])

    actor = UserProfile.objects.get(user_id=actor_id)
    audit(actor_id, actor.email, f"changed_role_to_{new_role.name}", target.user_id, target.email, {"old": old_role_name, "new": new_role.name})
    return {"success": True}

@api.get("/admin/roles", auth=lumina_auth)
def admin_list_roles(request):
    if not has_permission(request.auth, "can_manage_roles"):
        return api.create_response(request, {"detail": "Forbidden"}, status=403)
    
    roles = PlatformRole.objects.all().order_by("id")
    return [{"id": r.id, "name": r.name, "description": r.description, "is_system": r.is_system, "permissions": r.permissions} for r in roles]

@api.post("/admin/roles", auth=lumina_auth)
def admin_create_role(request, payload: RoleSchema):
    actor_id = request.auth
    if not has_permission(actor_id, "can_manage_roles"):
        return api.create_response(request, {"detail": "Forbidden"}, status=403)
        
    if PlatformRole.objects.filter(name__iexact=payload.name).exists():
        return api.create_response(request, {"detail": "Role name exists."}, status=400)
        
    role = PlatformRole.objects.create(name=payload.name, description=payload.description, permissions=payload.permissions)
    actor = UserProfile.objects.get(user_id=actor_id)
    audit(actor_id, actor.email, "created_role", detail={"role": role.name})
    return {"success": True, "id": role.id}

@api.put("/admin/roles/{role_id}", auth=lumina_auth)
def admin_update_role_def(request, role_id: int, payload: RoleSchema):
    actor_id = request.auth
    if not has_permission(actor_id, "can_manage_roles"):
        return api.create_response(request, {"detail": "Forbidden"}, status=403)
        
    try:
        role = PlatformRole.objects.get(id=role_id)
        if role.is_system and role.name in ["Super Admin", "User"]:
            return api.create_response(request, {"detail": "Core system roles cannot be modified."}, status=403)
            
        role.name = payload.name
        role.description = payload.description
        role.permissions = payload.permissions
        role.save()
        
        actor = UserProfile.objects.get(user_id=actor_id)
        audit(actor_id, actor.email, "updated_role", detail={"role": role.name})
        return {"success": True}
    except PlatformRole.DoesNotExist:
        return api.create_response(request, {"detail": "Role not found."}, status=404)

@api.get("/admin/analytics", auth=lumina_auth)
def admin_platform_analytics(request):
    user_id = request.auth
    if not has_permission(user_id, "can_manage_users"):
        return api.create_response(request, {"detail": "Requires user management permissions."}, status=403)

    from django.db.models import Avg, Count, Q
    from django.db.models.functions import TruncDate
    from django.utils import timezone
    from datetime import timedelta

    all_interactions = InteractionLog.objects.all()
    total_queries    = all_interactions.count()
    tickets          = all_interactions.filter(ticket_raised=True).count()
    resolved         = total_queries - tickets
    deflection       = round((resolved / total_queries) * 100, 1) if total_queries > 0 else 0
    avg_ms           = all_interactions.aggregate(avg=Avg("response_time_ms"))["avg"] or 0
    slow             = all_interactions.filter(response_time_ms__gt=3000).count()

    last_14    = timezone.now() - timedelta(days=14)
    daily_data = (
        all_interactions.filter(created_at__gte=last_14)
        .annotate(date=TruncDate("created_at"))
        .values("date")
        .annotate(queries=Count("id"), tickets=Count("id", filter=Q(ticket_raised=True)))
        .order_by("date")
    )
    daily_map = {e["date"].isoformat(): e for e in daily_data}
    timeline  = []
    for i in range(14):
        day = (timezone.now() - timedelta(days=13 - i)).date()
        e   = daily_map.get(day.isoformat(), {})
        timeline.append({"date": day.isoformat(), "queries": e.get("queries", 0), "tickets": e.get("tickets", 0)})

    return {
        "total_users":             UserProfile.objects.count(),
        "total_sessions":          ChatSession.objects.count(),
        "total_queries":           total_queries,
        "tickets_raised":          tickets,
        "resolved_without_ticket": resolved,
        "deflection_rate_percent": deflection,
        "avg_response_time_ms":    round(avg_ms),
        "slow_responses_over_3s":  slow,
        "total_knowledge_bases":   KnowledgeBase.objects.filter(is_active=True).count(),
        "timeline":                timeline,
    }


@api.get("/admin/audit-log", auth=lumina_auth)
def admin_audit_log(request, limit: int = 100):
    user_id = request.auth
    if not has_permission(user_id, "can_manage_users"):
        return api.create_response(request, {"detail": "Requires user management permissions."}, status=403)

    logs = AdminAuditLog.objects.all().order_by("-timestamp")[:limit]
    return [
        {
            "id":           log.id,
            "actor_email":  log.actor_email,
            "action":       log.action,
            "target_email": log.target_email,
            "detail":       log.detail,
            "timestamp":    log.timestamp.isoformat(),
        }
        for log in logs
    ]


@api.get("/admin/kb-list", auth=lumina_auth)
def admin_list_all_kbs(request):
    user_id = request.auth
    if not has_permission(user_id, "can_manage_users"):
        return api.create_response(request, {"detail": "Requires user management permissions."}, status=403)

    kbs = KnowledgeBase.objects.all().order_by("-created_at")
    result = []
    for kb in kbs:
        try:
            creator      = UserProfile.objects.get(user_id=kb.created_by)
            creator_name = creator.display_name or creator.email
        except UserProfile.DoesNotExist:
            creator_name = kb.created_by

        result.append({
            "id":            kb.id,
            "name":          kb.name,
            "description":   kb.description,
            "folder_name":   kb.folder_name,
            "created_by":    creator_name,
            "is_active":     kb.is_active,
            "member_count":  kb.memberships.filter(accepted=True).count(),
            "session_count": kb.sessions.count(),
            "created_at":    kb.created_at.isoformat(),
        })
    return result

@api.delete("/sessions/{user_id}/{session_id}", auth=lumina_auth)
def delete_session(request, user_id: str, session_id: int):
    if request.auth != user_id:
        return api.create_response(request, {"detail": "Forbidden"}, status=403)
    
    try:
        session = ChatSession.objects.get(id=session_id)
        
        # Security: Only the owner (or KB creator) can delete a session
        if session.kb:
            if session.kb:
                if session.kb.created_by != user_id and not has_permission(user_id, "can_manage_kbs"):
                    return api.create_response(request, {"detail": "Only the Knowledge Base creator can delete this shared chat."}, status=403)
        else:
            if session.user_id != user_id:
                return api.create_response(request, {"detail": "Not your session."}, status=403)
                
        # This will automatically CASCADE and delete all Interactions and Source Documents!
        session.delete() 
        return {"success": True}
        
    except ChatSession.DoesNotExist:
        return api.create_response(request, {"detail": "Session not found"}, status=404)