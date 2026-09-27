import { prisma } from './prisma'
import { cookies } from 'next/headers'

export async function requireAdmin() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.role !== 'ADMIN') throw new Error("Forbidden: Admin access required")
  
  return user
}

export async function getGlobalConfig() {
  let config = await prisma.globalConfig.findUnique({ where: { id: 'default' } })
  if (!config) {
    config = await prisma.globalConfig.create({
      data: {
        id: 'default',
        maintenanceMode: false,
        testMode: false,
        enabledGames: JSON.stringify(['crash', 'keno', 'baccarat', 'craps', 'holdem', 'blackjack', 'roulette', 'threecardpoker', 'slots']),
        gameOdds: JSON.stringify({})
      }
    })
  }
  return config
}

export async function logGameHistory(params: {
  userId: string,
  gameType: string,
  tableId?: string,
  betAmount: number,
  payout: number,
  details: any
}) {
  try {
    await prisma.gameHistory.create({
      data: {
        userId: params.userId,
        gameType: params.gameType,
        tableId: params.tableId,
        betAmount: params.betAmount,
        payout: params.payout,
        details: JSON.stringify(params.details)
      }
    })
  } catch (e) {
    console.error("Failed to log game history:", e)
  }
}
