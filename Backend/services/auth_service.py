from google_auth_oauthlib.flow import Flow
from core.config import CLIENT_SECRETS_FILE, SCOPES, REDIRECT_URI
from core.state import oauth_flows, user_sessions
from core.logger import logger

def generate_auth_url(user_id: str):
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES, redirect_uri=REDIRECT_URI
    )
    auth_url, state = flow.authorization_url(access_type='offline', prompt='consent', state=user_id)
    oauth_flows[state] = flow
    return auth_url, state

def process_callback(state: str, code: str):
    flow = oauth_flows.get(state)
    if not flow:
        return None
    
    flow.fetch_token(code=code)
    credentials = flow.credentials
    
    user_sessions[state] = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }
    del oauth_flows[state]
    return state