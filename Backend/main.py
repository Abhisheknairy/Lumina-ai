from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

# Import our modularized code
from core.logger import logger
from core.state import user_sessions
from models.schemas import ChatRequest
from services import auth_service, drive_service, rag_service

app = FastAPI(title="Google Drive RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/login")
def login(user_id: str):
    logger.info(f"Login initiated for user: {user_id}")
    auth_url, state = auth_service.generate_auth_url(user_id)
    return RedirectResponse(url=auth_url)

@app.get("/auth/callback")
def auth_callback(state: str, code: str):
    logger.info(f"Auth callback received for state: {state}")
    success_state = auth_service.process_callback(state, code)
    if not success_state:
        raise HTTPException(status_code=400, detail="Session expired or invalid state")
    return RedirectResponse(url=f"http://localhost:5173/chat?user_id={state}")

@app.get("/list-drive-items/{user_id}")
async def list_drive_items(user_id: str):
    if user_id not in user_sessions:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    service = drive_service.get_drive_service(user_id)
    return StreamingResponse(
        drive_service.drive_item_stream_generator(service), 
        media_type="application/x-ndjson"
    )

@app.post("/ingest-item/{user_id}/{item_id}")
def ingest_item(user_id: str, item_id: str):
    logger.info(f"Ingestion started: User {user_id}, Item {item_id}")
    if user_id not in user_sessions:
        raise HTTPException(status_code=401, detail="User not authenticated")
        
    service = drive_service.get_drive_service(user_id)
    
    try:
        root_item = service.files().get(fileId=item_id, supportsAllDrives=True, fields="id, name, mimeType").execute()
        files_to_process = drive_service.get_all_files_recursive(service, item_id) if root_item['mimeType'] == 'application/vnd.google-apps.folder' else [root_item]
        
        all_documents = []
        for f in files_to_process:
            text_content = drive_service.extract_text_from_file(service, f['id'], f['mimeType'])
            if text_content and text_content.strip():
                all_documents.append({"text": text_content, "metadata": {"source": f['name'], "user_id": user_id}})

        if not all_documents:
            raise HTTPException(status_code=400, detail="Could not extract readable text.")

        total_chunks = rag_service.chunk_and_store_documents(all_documents)
        return {"message": "Ingestion Complete!", "files_processed": len(all_documents), "total_chunks": total_chunks}
            
    except Exception as e:
        logger.exception(f"Error during ingestion: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/{user_id}/{folder_id}")
def chat_with_documents(user_id: str, folder_id: str, request: ChatRequest):
    logger.info(f"Chat request from {user_id}")
    answer, sources = rag_service.process_chat_query(user_id, request.question)
    return {"answer": answer, "sources_used": sources}