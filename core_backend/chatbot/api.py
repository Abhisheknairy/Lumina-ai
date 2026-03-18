from ninja import NinjaAPI, Schema
from django.http import HttpResponseRedirect, StreamingHttpResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import os
import io
import json
import asyncio
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

# Initialize Django Ninja API
api = NinjaAPI(title="Lumina AI Django API")

# Configuration
from pathlib import Path

# --- PATH CONFIGURATION ---
CURRENT_DIR = Path(__file__).resolve().parent
BASE_DIR = CURRENT_DIR.parent

# Point directly to the files inside core_backend
CLIENT_SECRETS_FILE = str(BASE_DIR / "client_secret.json")
CHROMA_PERSIST_DIR = str(BASE_DIR / "chroma_db")

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
REDIRECT_URI = "http://localhost:8000/api/auth/callback" 

# In-memory session storage (OAuth flow)
user_sessions = {}
oauth_flows = {} 

# Initialize AI Tools
GOOGLE_API_KEY = "AIzaSyAv2I5cUmNXI88c8_79xRexfoMa7kFvcS8"


# In-memory session storage (OAuth flow)
user_sessions = {}
oauth_flows = {} 


embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=GOOGLE_API_KEY, temperature=0.3)

class ChatRequest(Schema):
    question: str

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
    user_sessions[state] = {
        'token': credentials.token, 'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri, 'client_id': credentials.client_id,
        'client_secret': credentials.client_secret, 'scopes': credentials.scopes
    }
    del oauth_flows[state]
    return HttpResponseRedirect(f"http://localhost:5173/chat?user_id={state}")


# ------------------------------------------------------------------
# 2. DRIVE STREAMING & INGESTION
# ------------------------------------------------------------------
@api.get("/list-drive-items/{user_id}")
def list_drive_items(request, user_id: str):
    if user_id not in user_sessions:
        return api.create_response(request, {"detail": "Not authenticated"}, status=401)
        
    from google.oauth2.credentials import Credentials
    creds = Credentials(**user_sessions[user_id])
    service = build('drive', 'v3', credentials=creds)
    
    async def event_generator():
        page_token = None
        query = ("(mimeType='application/vnd.google-apps.folder' or "
                 "mimeType='application/vnd.google-apps.document' or "
                 "mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document' or "
                 "mimeType='application/pdf') and trashed=false")
        try:
            for _ in range(10): 
                loop = asyncio.get_event_loop()
                results = await loop.run_in_executor(None, lambda: service.files().list(
                    q=query, corpora="allDrives", includeItemsFromAllDrives=True, supportsAllDrives=True,
                    fields="nextPageToken, files(id, name, mimeType, shared, ownedByMe, modifiedTime)",
                    orderBy="modifiedTime desc", pageSize=200, pageToken=page_token
                ).execute())
                
                items = results.get('files', [])
                page_token = results.get('nextPageToken')
                if items:
                    yield json.dumps(items) + "\n"
                if not page_token: break
        except Exception as e:
            yield json.dumps({"error": str(e)}) + "\n"

    return StreamingHttpResponse(event_generator(), content_type="application/x-ndjson")

@api.post("/ingest-item/{user_id}/{item_id}")
def ingest_item(request, user_id: str, item_id: str):
    if user_id not in user_sessions:
        return api.create_response(request, {"detail": "Not authenticated"}, status=401)
        
    from google.oauth2.credentials import Credentials
    creds = Credentials(**user_sessions[user_id])
    service = build('drive', 'v3', credentials=creds)
    
    try:
        root_item = service.files().get(fileId=item_id, supportsAllDrives=True, fields="id, name, mimeType").execute()
        
        # Helper for recursion inline to keep it clean
        def get_files_recursive(folder_id):
            found = []
            q = f"'{folder_id}' in parents and trashed=false"
            pt = None
            while True:
                res = service.files().list(q=q, corpora="allDrives", includeItemsFromAllDrives=True, supportsAllDrives=True, fields="nextPageToken, files(id, name, mimeType)", pageSize=1000, pageToken=pt).execute()
                for it in res.get('files', []):
                    if it['mimeType'] == 'application/vnd.google-apps.folder':
                        found.extend(get_files_recursive(it['id']))
                    else:
                        found.append(it)
                pt = res.get('nextPageToken')
                if not pt: break
            return found

        files_to_process = get_files_recursive(item_id) if root_item['mimeType'] == 'application/vnd.google-apps.folder' else [root_item]
        
        all_documents = []
        for f in files_to_process:
            mime_type = f['mimeType']
            text_content = ""
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
                    all_documents.append({"text": text_content, "metadata": {"source": f['name'], "user_id": user_id}})
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
            Chroma.from_texts(texts=chunks, embedding=embeddings, metadatas=metadatas, persist_directory=CHROMA_PERSIST_DIR)
            return {"message": "Ingestion Complete!", "files_processed": len(all_documents), "total_chunks_saved": len(chunks)}
            
    except Exception as e:
        return api.create_response(request, {"detail": str(e)}, status=500)


# ------------------------------------------------------------------
# 3. CHAT ENDPOINT & DATABASE LOGGING (FR-007 & NFR-001)
# ------------------------------------------------------------------
@api.post("/chat/{user_id}/{folder_id}")
def chat_with_documents(request, user_id: str, folder_id: str, payload: ChatRequest):
    # Track response time exactly as the client requested (NFR-001)
    start_time = time.time()
    
    # RAG Logic
    vector_store = Chroma(persist_directory=CHROMA_PERSIST_DIR, embedding_function=embeddings)
    docs = vector_store.similarity_search(query=payload.question, k=4, filter={"user_id": user_id})
    
    context_text = "\n\n---\n\n".join([doc.page_content for doc in docs]) if docs else "No relevant documents found."
    
    prompt = f"Context from Google Drive: {context_text}\nUser Question: {payload.question}"
    response = llm.invoke(prompt)
    
    end_time = time.time()
    response_time_ms = int((end_time - start_time) * 1000)
    
    sources = list(set([doc.metadata.get("source") for doc in docs]))

    # --- DATABASE LOGGING FOR CLIENT REQUIREMENT FR-007 ---
    try:
        # 1. Get or Create the Chat Session
        session, _ = ChatSession.objects.get_or_create(
            user_id=user_id,
            folder_id=folder_id,
            defaults={'folder_name': 'Drive Connected'}
        )
        
        # 2. Log the Interaction (Question, Answer, and Speed)
        interaction = InteractionLog.objects.create(
            session=session,
            user_query=payload.question,
            ai_response=response.content,
            response_time_ms=response_time_ms
        )
        
        # 3. Log the Sources Used
        for src in sources:
            SourceDocument.objects.create(
                interaction=interaction,
                document_name=src
            )
    except Exception as e:
        print(f"Failed to log to Database: {e}")

    return {
        "answer": response.content,
        "sources_used": sources,
        "response_time_ms": response_time_ms
    }