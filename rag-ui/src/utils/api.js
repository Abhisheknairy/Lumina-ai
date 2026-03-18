/**
 * Lumina AI — Frontend API utility
 *
 * Every protected backend endpoint now requires:
 *   Authorization: Bearer <user_id>
 *
 * Use authFetch() instead of plain fetch() for all protected calls.
 * Use authFetchStream() for the /chat streaming endpoint.
 * Plain fetch() is only needed for /login and /get-token (public endpoints).
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * authFetch — drop-in replacement for fetch() that injects the Bearer header.
 *
 * Usage (in Chat.jsx, Analytics.jsx etc.):
 *   const res = await authFetch(userId, `/api/sessions/${userId}`)
 *   const res = await authFetch(userId, `/api/ingest-item/${userId}/${itemId}`, { method: 'POST' })
 */
export async function authFetch(userId, path, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Authorization': `Bearer ${userId}`,
    },
  });
}

/**
 * authFetchStream — for the /chat streaming endpoint.
 * Returns the raw Response so the caller can read the body as a stream.
 *
 * Usage (in Chat.jsx):
 *   const res = await authFetchStream(userId, `/api/chat/${userId}/${folderId}`, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ question, folder_name }),
 *   });
 *   const reader = res.body.getReader();
 */
export async function authFetchStream(userId, path, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Authorization': `Bearer ${userId}`,
    },
  });
}