import { createServer } from 'http'
import { Server } from 'socket.io'

// Internal endpoint: POST /notify { userId?, room?, event, data }
// Only accepted from the same machine/container (loopback) - the public site only
// proxies /socket.io/*, so this is never reachable from the internet.
const httpServer = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/notify') {
    const ip = req.socket.remoteAddress || ''
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)) {
      res.writeHead(403).end()
      return
    }
    let body = ''
    req.on('data', c => { body += c; if (body.length > 1e5) req.destroy() })
    req.on('end', () => {
      try {
        const { userId, room, event, data } = JSON.parse(body || '{}')
        if (event) {
          const target = room || (userId ? `user_${userId}` : null)
          if (target) io.to(target).emit(event, data)
        }
        res.writeHead(204).end()
      } catch {
        res.writeHead(400).end()
      }
    })
    return
  }
  // Socket.io handles its own /socket.io/ paths; anything else is not found
  if (!req.url?.startsWith('/socket.io')) res.writeHead(404).end()
})
const io = new Server(httpServer, {
  cors: {
    origin: '*', // For local dev, allow all
    methods: ['GET', 'POST']
  }
})

// socketId -> { userId, username, location }
const connectedUsers = new Map()

function getPlayersAtTable(tableId) {
  return Array.from(connectedUsers.values()).filter(u => u.location === tableId)
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('authenticate', (userData) => {
    connectedUsers.set(socket.id, {
      userId: userData.userId,
      username: userData.username,
      location: 'lobby'
    })
    socket.join(`user_${userData.userId}`)
    io.emit('presence_update', Array.from(connectedUsers.values()))
  })

  // Join a specific table room
  socket.on('join_table', (tableId, userData) => {
    socket.join(tableId)
    console.log(`Socket ${socket.id} joined table ${tableId}`)
    
    if (connectedUsers.has(socket.id)) {
      const user = connectedUsers.get(socket.id)
      user.location = tableId
      connectedUsers.set(socket.id, user)
      io.emit('presence_update', Array.from(connectedUsers.values()))
    }
    
    io.to(tableId).emit('table_players', getPlayersAtTable(tableId))
  })

  socket.on('leave_table', (tableId) => {
    socket.leave(tableId)
    console.log(`Socket ${socket.id} left table ${tableId}`)
    
    if (connectedUsers.has(socket.id)) {
      const user = connectedUsers.get(socket.id)
      user.location = 'lobby'
      connectedUsers.set(socket.id, user)
      io.emit('presence_update', Array.from(connectedUsers.values()))
    }
    
    io.to(tableId).emit('table_players', getPlayersAtTable(tableId))
  })

  // Live broadcast of bet or move
  socket.on('live_action', (data) => {
    socket.to(data.tableId).emit('table_action', data)
  })

  // When a user makes a move that requires a server re-fetch
  socket.on('action_taken', (tableId) => {
    socket.to(tableId).emit('update_required')
  })

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id)
    if (user) {
      const lastLocation = user.location
      connectedUsers.delete(socket.id)
      io.emit('presence_update', Array.from(connectedUsers.values()))
      if (lastLocation && lastLocation !== 'lobby') {
        io.to(lastLocation).emit('table_players', getPlayersAtTable(lastLocation))
      }
    }
    console.log('Client disconnected:', socket.id)
  })
})

const PORT = 3001
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on http://localhost:${PORT}`)
})
