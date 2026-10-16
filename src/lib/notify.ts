/**
 * Server-side: push a realtime event to a user's browser(s) via the socket server.
 * Never throws - a notification failure must not break the action that called it.
 */
const NOTIFY_URL = (process.env.SOCKET_INTERNAL_URL || 'http://127.0.0.1:3001') + '/notify'

export async function notifyUser(userId: string, event: string, data?: unknown) {
  try {
    await fetch(NOTIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, event, data }),
      signal: AbortSignal.timeout(1500),
    })
  } catch (e) {
    console.error('notifyUser failed:', e)
  }
}
