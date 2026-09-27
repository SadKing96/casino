import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: '*', // For local dev, allow all
    methods: ['GET', 'POST']
  }
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // Join a specific table room
  socket.on('join_table', (tableId) => {
    socket.join(tableId)
    console.log(`Socket ${socket.id} joined table ${tableId}`)
  })

  socket.on('leave_table', (tableId) => {
    socket.leave(tableId)
    console.log(`Socket ${socket.id} left table ${tableId}`)
  })

  // When a user makes a move, they emit this event
  socket.on('action_taken', (tableId) => {
    // Broadcast to everyone else at the table that they need to fetch the latest state
    socket.to(tableId).emit('update_required')
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

const PORT = 3001
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on http://localhost:${PORT}`)
})
