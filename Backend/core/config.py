import os

# Allow HTTP for local testing
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

# Google OAuth Settings
CLIENT_SECRETS_FILE = "client_secret.json"
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
REDIRECT_URI = "http://localhost:8000/auth/callback"

# RAG & LLM Settings
CHROMA_PERSIST_DIR = "./chroma_db"
GOOGLE_API_KEY = "AIzaSyAv2I5cUmNXI88c8_79xRexfoMa7kFvcS8" # Use your actual key