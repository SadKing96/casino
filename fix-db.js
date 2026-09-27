const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function run() {
  const count = await prisma.holdemState.deleteMany({
    where: { players: '[]' }
  })
  console.log("Deleted", count.count, "corrupted holdem states")
}
run()
