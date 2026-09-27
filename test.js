const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function run() {
  try {
    const user = await prisma.user.findFirst()
    console.log("User:", user)
    const state = await prisma.holdemState.findUnique({ where: { userId: user.id } })
    console.log("State:", state)
    if (!state) {
      console.log("creating state")
      await prisma.holdemState.create({
        data: {
          userId: user.id,
          status: 'LOBBY',
          players: '[]',
          communityCards: '[]',
          chatHistory: '[]'
        }
      })
    }
  } catch (e) {
    console.error(e)
  }
}
run()
