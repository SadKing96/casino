import type { NextConfig } from "next";

const SOCKET_INTERNAL = process.env.SOCKET_INTERNAL_URL || "http://127.0.0.1:3001";

const nextConfig: NextConfig = {
  // Socket.io endpoints end in "/socket.io/" - don't let Next strip the slash.
  skipTrailingSlashRedirect: true,
  // Proxy Socket.io (server.mjs on :3001) through the app's own origin so remote
  // players connect via https://casino.zlking.me without exposing another port.
  async rewrites() {
    return [
      { source: "/socket.io", destination: `${SOCKET_INTERNAL}/socket.io/` },
      { source: "/socket.io/:path*", destination: `${SOCKET_INTERNAL}/socket.io/:path*` },
    ];
  },
};

export default nextConfig;
