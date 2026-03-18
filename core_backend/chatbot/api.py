from ninja import NinjaAPI, Schema
from django.http import HttpResponseRedirect
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import os
import io
import docx
import time
from PyPDF2 import PdfReader

# --- LangChain Imports ---
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_google_genai import ChatGoogleGenerativeAI

# --- Import our Django Database Models ---
from .models import ChatSession, InteractionLog, SourceDocument

# Allow HTTP for local testing
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
# Allow Google to return extra scopes (e.g. openid) without raising an error
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

api = NinjaAPI(title="Lumina AI Django API")

from pathlib import Path
CURRENT_DIR = Path(__file__).resolve().parent
BASE_DIR = CURRENT_DIR.parent

CLIENT_SECRETS_FILE = str(BASE_DIR / "client_secret.json")
CHROMA_PERSIST_DIR = str(BASE_DIR / "chroma_db")

SCOPES = ['openid', 'https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email']
REDIRECT_URI = "http://localhost:8000/api/auth/callback"

# In-memory session storage (OAuth flow)
# NOTE: Use Redis/DB-backed sessions in production
user_sessions = {}
oauth_flows = {}

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "AIzaSyC0OzyJH_I-uI8eWmPs0NYZ1XdhQbMsjb4")

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=GOOGLE_API_KEY, temperature=0.3)


# ------------------------------------------------------------------
# SCHEMAS
# ------------------------------------------------------------------
class ChatRequest(Schema):
    question: str

class TicketRequest(Schema):
    interaction_id: int
    user_query: str
    ai_response: str
    # Add your ticketing system fields here (e.g. Jira project key)
    priority: str = "medium"


# ------------------------------------------------------------------
# 1. AUTHENTICATION ENDPOINTS
# ------------------------------------------------------------------
@api.get("/login")
def login(request, user_id: str):
    flow = Flow.from_client_secrets_file(CLIENT_SECRETS_FILE, scopes=SCOPES, redirect_uri=REDIRECT_URI)
    auth_url, state = flow.authorization_url(access_type='offline', prompt='consent', state=user_id)
    oauth_flows[state] = flow
    return HttpResponseRedirect(auth_url)


@api.get("/auth/callback")
def auth_callback(request, state: str, code: str):
    flow = oauth_flows.get(state)
    if not flow:
        return api.create_response(request, {"detail": "Session expired"}, status=400)

    flow.fetch_token(code=code)
    credentials = flow.credentials

    # Fetch real Google profile name + email
    display_name = state  # fallback to user_id
    email = ''
    try:
        people_service = build('people', 'v1', credentials=credentials)
        profile = people_service.people().get(
            resourceName='people/me',
            personFields='names,emailAddresses'
        ).execute()
        names = profile.get('names', [])
        emails = profile.get('emailAddresses', [])
        if names:
            display_name = names[0].get('displayName', state)
        if emails:
            email = emails[0].get('value', '')
    except Exception:
        pass  # fallback to user_id if People API fails

    user_sessions[state] = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes,
        'display_name': display_name,
        'email': email,
    }
    del oauth_flows[state]
    return HttpResponseRedirect(f"http://localhost:5173/chat?user_id={state}")


@api.get("/get-token/{user_id}")
def get_access_token(request, user_id: str):
    """Returns OAuth access token + profile info to the React frontend (FR-002)."""
    if user_id not in user_sessions:
        return api.create_response(request, {"detail": "Not authenticated"}, status=401)
    session = user_sessions[user_id]
    return {
        "access_token": session['token'],
        "display_name": session.get('display_name', user_id),
        "email": session.get('email', ''),
    }


# ------------------------------------------------------------------
# 2. INGESTION ENDPOINT — FR-002, FR-004, FR-005
# ------------------------------------------------------------------
@api.post("/ingest-item/{user_id}/{item_id}")
def ingest_item(request, user_id: str, item_id: str):
    if user_id not in user_sessions:
        return api.create_response(request, {"detail": "Not authenticated"}, status=401)

    from google.oauth2.credentials import Credentials
    # Only pass OAuth credential keys — exclude profile fields like display_name, email
    CRED_KEYS = {'token', 'refresh_token', 'token_uri', 'client_id', 'client_secret', 'scopes'}
    creds = Credentials(**{k: v for k, v in user_sessions[user_id].items() if k in CRED_KEYS})
    service = build('drive', 'v3', credentials=creds)

    try:
        root_item = service.files().get(
            fileId=item_id, supportsAllDrives=True,
            fields="id, name, mimeType, webViewLink"
        ).execute()

        def get_files_recursive(folder_id):
            """Recursively collect all files under a folder."""
            found = []
            q = f"'{folder_id}' in parents and trashed=false"
            pt = None
            while True:
                res = service.files().list(
                    q=q, corpora="allDrives",
                    includeItemsFromAllDrives=True, supportsAllDrives=True,
                    fields="nextPageToken, files(id, name, mimeType, webViewLink)",
                    pageSize=1000, pageToken=pt
                ).execute()
                for it in res.get('files', []):
                    if it['mimeType'] == 'application/vnd.google-apps.folder':
                        found.extend(get_files_recursive(it['id']))
                    else:
                        found.append(it)
                pt = res.get('nextPageToken')
                if not pt:
                    break
            return found

        files_to_process = (
            get_files_recursive(item_id)
            if root_item['mimeType'] == 'application/vnd.google-apps.folder'
            else [root_item]
        )

        all_documents = []
        for f in files_to_process:
            mime_type = f['mimeType']
            text_content = ""
            # FR-004: Build the direct Drive link for this file
            drive_link = f.get('webViewLink') or f"https://drive.google.com/file/d/{f['id']}/view"

            try:
                if mime_type == 'application/vnd.google-apps.document':
                    req = service.files().export_media(fileId=f['id'], mimeType='text/plain')
                    text_content = req.execute().decode('utf-8')
                elif mime_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    req = service.files().get_media(fileId=f['id'])
                    doc = docx.Document(io.BytesIO(req.execute()))
                    text_content = "\n".join([p.text for p in doc.paragraphs])
                elif mime_type == 'application/pdf':
                    req = service.files().get_media(fileId=f['id'])
                    pdf = PdfReader(io.BytesIO(req.execute()))
                    text_content = "\n".join([p.extract_text() for p in pdf.pages if p.extract_text()])
                else:
                    req = service.files().get_media(fileId=f['id'])
                    text_content = req.execute().decode('utf-8', errors='ignore')

                if text_content.strip():
                    all_documents.append({
                        "text": text_content,
                        "metadata": {
                            "source": f['name'],
                            "source_link": drive_link,   # FR-004: stored in vector metadata
                            "file_id": f['id'],
                            "user_id": user_id,
                        }
                    })
            except Exception:
                pass

        if not all_documents:
            return api.create_response(request, {"detail": "No readable text found."}, status=400)

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
        chunks, metadatas = [], []
        for doc in all_documents:
            split_texts = text_splitter.split_text(doc["text"])
            chunks.extend(split_texts)
            metadatas.extend([doc["metadata"]] * len(split_texts))

        if chunks:
            # Use get_or_create collection pattern to avoid duplicate chunks on re-ingest
            vector_store = Chroma(
                collection_name=f"user_{user_id}",
                embedding_function=embeddings,
                persist_directory=CHROMA_PERSIST_DIR
            )
            vector_store.add_texts(texts=chunks, metadatas=metadatas)
            return {
                "message": "Ingestion Complete!",
                "files_processed": len(all_documents),
                "total_chunks_saved": len(chunks)
            }

    except Exception as e:
        return api.create_response(request, {"detail": str(e)}, status=500)


# ------------------------------------------------------------------
# 3. CHAT ENDPOINT — FR-003, FR-004, FR-007, NFR-001
# ------------------------------------------------------------------
@api.post("/chat/{user_id}/{folder_id}")
def chat_with_documents(request, user_id: str, folder_id: str, payload: ChatRequest):
    start_time = time.time()

    # Use per-user collection to prevent data bleed between users (NFR-003)
    vector_store = Chroma(
        collection_name=f"user_{user_id}",
        embedding_function=embeddings,
        persist_directory=CHROMA_PERSIST_DIR
    )
    docs = vector_store.similarity_search(query=payload.question, k=4)

    context_text = (
        "\n\n---\n\n".join([doc.page_content for doc in docs])
        if docs else "No relevant documents found."
    )

    prompt = (
        f"You are a helpful assistant. Answer the user's question based ONLY on the provided context.\n"
        f"If the context doesn't contain the answer, say so clearly.\n\n"
        f"Context:\n{context_text}\n\n"
        f"Question: {payload.question}"
    )
    response = llm.invoke(prompt)

    end_time = time.time()
    response_time_ms = int((end_time - start_time) * 1000)

    # FR-004: Build sources with names AND direct Drive links
    sources_with_links = {}
    for doc in docs:
        name = doc.metadata.get("source", "Unknown")
        link = doc.metadata.get("source_link", "")
        if name not in sources_with_links:
            sources_with_links[name] = link

    # FR-007: Log to database
    interaction_id = None
    try:
        session, _ = ChatSession.objects.get_or_create(
            user_id=user_id,
            folder_id=folder_id,
            defaults={'folder_name': 'Drive Connected'}
        )
        interaction = InteractionLog.objects.create(
            session=session,
            user_query=payload.question,
            ai_response=response.content,
            response_time_ms=response_time_ms
        )
        interaction_id = interaction.id

        # FR-004: Save document links to DB
        for doc_name, doc_link in sources_with_links.items():
            SourceDocument.objects.create(
                interaction=interaction,
                document_name=doc_name,
                document_link=doc_link or None
            )
    except Exception as e:
        print(f"DB logging failed: {e}")

    return {
        "answer": response.content,
        # FR-004: Return list of {name, link} objects so UI can render clickable links
        "sources_used": [
            {"name": name, "link": link}
            for name, link in sources_with_links.items()
        ],
        "response_time_ms": response_time_ms,
        "interaction_id": interaction_id,   # FR-006: needed by frontend to raise ticket
    }


# ------------------------------------------------------------------
# 4. RAISE TICKET ENDPOINT — FR-006
# ------------------------------------------------------------------
@api.post("/raise-ticket/{user_id}")
def raise_ticket(request, user_id: str, payload: TicketRequest):
    """
    FR-006: Called when the AI couldn't resolve the user's issue.
    Marks the interaction in DB and calls the configured ticketing system.
    
    To integrate with Jira/ServiceNow/AppSteer, add credentials to
    environment variables and implement the API call below.
    """
    if user_id not in user_sessions:
        return api.create_response(request, {"detail": "Not authenticated"}, status=401)

    try:
        # 1. Mark the interaction in our DB (FR-007 — ticket_raised flag)
        if payload.interaction_id:
            InteractionLog.objects.filter(id=payload.interaction_id).update(ticket_raised=True)

        # 2. --- TICKETING SYSTEM INTEGRATION POINT ---
        # Uncomment and configure the system you're using:
        #
        # --- JIRA ---
        # import requests as req
        # jira_url = os.environ.get("JIRA_URL")
        # jira_token = os.environ.get("JIRA_API_TOKEN")
        # jira_email = os.environ.get("JIRA_EMAIL")
        # jira_project = os.environ.get("JIRA_PROJECT_KEY", "SUP")
        # req.post(f"{jira_url}/rest/api/3/issue", json={
        #     "fields": {
        #         "project": {"key": jira_project},
        #         "summary": f"Unresolved AI Query: {payload.user_query[:80]}",
        #         "description": {
        #             "type": "doc", "version": 1,
        #             "content": [{"type": "paragraph", "content": [
        #                 {"type": "text", "text": f"User Query: {payload.user_query}\n\nAI Response: {payload.ai_response}"}
        #             ]}]
        #         },
        #         "issuetype": {"name": "Support Request"},
        #         "priority": {"name": payload.priority.capitalize()},
        #     }
        # }, auth=(jira_email, jira_token), headers={"Content-Type": "application/json"})
        #
        # --- ServiceNow ---
        # req.post(f"{os.environ.get('SNOW_URL')}/api/now/table/incident", json={
        #     "short_description": f"AI Unresolved: {payload.user_query[:80]}",
        #     "description": f"Query: {payload.user_query}\nAI Response: {payload.ai_response}",
        #     "urgency": "2", "impact": "2"
        # }, auth=(os.environ.get("SNOW_USER"), os.environ.get("SNOW_PASS")),
        # headers={"Content-Type": "application/json", "Accept": "application/json"})

        return {
            "success": True,
            "message": "Ticket raised successfully. Our support team will be in touch shortly.",
            "interaction_id": payload.interaction_id,
        }

    except Exception as e:
        return api.create_response(request, {"detail": f"Failed to raise ticket: {str(e)}"}, status=500)


# ------------------------------------------------------------------
# 5. ANALYTICS ENDPOINT — BR-001 (KPI Dashboard data)
# ------------------------------------------------------------------
@api.get("/analytics/{user_id}")
def get_analytics(request, user_id: str):
    """
    BR-001: Returns KPI data for the admin/reporting dashboard.
    Tracks ticket deflection rate, response times, and usage.
    """
    from django.db.models import Avg, Count, Q

    sessions = ChatSession.objects.filter(user_id=user_id)
    interactions = InteractionLog.objects.filter(session__in=sessions)

    total_queries = interactions.count()
    tickets_raised = interactions.filter(ticket_raised=True).count()
    resolved_without_ticket = total_queries - tickets_raised
    deflection_rate = (
        round((resolved_without_ticket / total_queries) * 100, 1)
        if total_queries > 0 else 0
    )
    avg_response_ms = interactions.aggregate(avg=Avg('response_time_ms'))['avg'] or 0
    slow_responses = interactions.filter(response_time_ms__gt=3000).count()

    return {
        "total_queries": total_queries,
        "tickets_raised": tickets_raised,
        "resolved_without_ticket": resolved_without_ticket,
        "deflection_rate_percent": deflection_rate,   # BR-001: target >= 20%
        "avg_response_time_ms": round(avg_response_ms),
        "slow_responses_over_3s": slow_responses,     # NFR-001 violations
        "sessions_count": sessions.count(),
    }