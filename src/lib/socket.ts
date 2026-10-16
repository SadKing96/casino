import { io, Socket } from 'socket.io-client'

/**
 * Socket.io connects through the SAME origin the page was served from
 * (e.g. https://casino.zlking.me). next.config.ts rewrites /socket.io/* to the
 * socket server on :3001 inside the container, so no extra port or reverse-proxy
 * rule is needed. Long-polling is used because it passes cleanly through the
 * Next rewrite and any HTTPS proxy in front of it.
 *
 * Set NEXT_PUBLIC_SOCKET_URL to override (e.g. a dedicated websocket host).
 */
export function getSocketUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SOCKET_URL || undefined // undefined = same origin
}

export function connectSocket(): Socket {
  const url = getSocketUrl()
  const opts = { path: '/socket.io', transports: url ? undefined : ['polling'] } as any
  return url ? io(url, opts) : io(opts)
}
