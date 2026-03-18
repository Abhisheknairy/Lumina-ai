from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
import asyncio
import json
import io
import docx
from PyPDF2 import PdfReader
from core.state import user_sessions
from core.logger import logger

def get_drive_service(user_id: str):
    creds = Credentials(**user_sessions[user_id])
    return build('drive', 'v3', credentials=creds)

def get_all_files_recursive(service, item_id):
    files_found = []
    query = f"'{item_id}' in parents and trashed=false"
    page_token = None
    
    while True:
        results = service.files().list(
            q=query, corpora="allDrives", includeItemsFromAllDrives=True,
            supportsAllDrives=True, fields="nextPageToken, files(id, name, mimeType)",
            pageSize=1000, pageToken=page_token
        ).execute()
        
        items = results.get('files', [])
        for item in items:
            if item['mimeType'] == 'application/vnd.google-apps.folder':
                files_found.extend(get_all_files_recursive(service, item['id']))
            else:
                files_found.append(item)
        
        page_token = results.get('nextPageToken')
        if not page_token:
            break
    return files_found

def extract_text_from_file(service, file_id, mime_type):
    try:
        if mime_type == 'application/vnd.google-apps.document':
            request = service.files().export_media(fileId=file_id, mimeType='text/plain')
            return request.execute().decode('utf-8')
        elif mime_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            request = service.files().get_media(fileId=file_id)
            doc = docx.Document(io.BytesIO(request.execute()))
            return "\n".join([para.text for para in doc.paragraphs])
        elif mime_type == 'application/pdf':
            request = service.files().get_media(fileId=file_id)
            pdf_reader = PdfReader(io.BytesIO(request.execute()))
            return "\n".join([page.extract_text() for page in pdf_reader.pages if page.extract_text()])
        else:
            request = service.files().get_media(fileId=file_id)
            return request.execute().decode('utf-8', errors='ignore')
    except Exception as e:
        logger.error(f"Text extraction failed: {str(e)}")
        return ""

async def drive_item_stream_generator(service):
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