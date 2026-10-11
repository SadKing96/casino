'use server'

import { requireAdmin, getGlobalConfig } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

// Admin must be verified for ALL these actions
export async function getAllUsers() {
  await requireAdmin()
  return await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function updateUserBalance(userId: string, credits: number) {
  await requireAdmin()
  await prisma.user.update({
    where: { id: userId },
    data: { credits }
  })
  revalidatePath('/admin')
}

export async function toggleUserBan(userId: string, isBanned: boolean) {
  await requireAdmin()
  await prisma.user.update({
    where: { id: userId },
    data: { role: isBanned ? 'BANNED' : 'PLAYER' }
  })
  revalidatePath('/admin')
}

export async function getAuditLogs() {
  await requireAdmin()
  return await prisma.gameHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100, // Limit to recent 100 for performance
    include: {
      user: {
        select: { username: true }
      }
    }
  })
}

export async function getTransactions() {
  await requireAdmin()
  return await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: {
        select: { username: true }
      }
    }
  })
}

export async function toggleGameEnabled(gameId: string, enabled: boolean) {
  await requireAdmin()
  const config = await getGlobalConfig()
  let enabledGames: string[] = JSON.parse(config.enabledGames)
  
  if (enabled && !enabledGames.includes(gameId)) {
    enabledGames.push(gameId)
  } else if (!enabled && enabledGames.includes(gameId)) {
    enabledGames = enabledGames.filter(id => id !== gameId)
  }

  await prisma.globalConfig.update({
    where: { id: 'default' },
    data: { enabledGames: JSON.stringify(enabledGames) }
  })
  revalidatePath('/')
  revalidatePath('/admin')
}

export async function getAdminConfig() {
  await requireAdmin()
  return await getGlobalConfig()
}

export async function createUser(data: { username: string, password?: string, requiresPasswordReset: boolean, chipBalance: number, role: string }) {
  await requireAdmin()
  
  let passwordHash = null
  if (data.password) {
    passwordHash = await bcrypt.hash(data.password, 10)
  }

  await prisma.user.create({
    data: {
      username: data.username,
      passwordHash,
      requiresPasswordReset: data.requiresPasswordReset,
      credits: data.chipBalance,
      role: data.role
    }
  })
  revalidatePath('/admin')
}

export async function deleteUser(userId: string) {
  await requireAdmin()
  await prisma.user.delete({
    where: { id: userId }
  })
  revalidatePath('/admin')
}

export async function getHouseStats() {
  await requireAdmin()
  
  // Get house bank balance
  let config = await prisma.globalConfig.findUnique({ where: { id: 'default' } })
  if (!config) {
    config = await prisma.globalConfig.create({ data: { id: 'default' } })
  }

  // Get total fiat deposits
  const deposits = await prisma.transaction.aggregate({
    where: { type: 'FIAT_DEPOSIT', status: 'COMPLETED' },
    _sum: { amount: true }
  })

  // Get total player liability (chips)
  const liability = await prisma.user.aggregate({
    _sum: { credits: true }
  })

  // Get house net profit (bets - payouts)
  const gameHistory = await prisma.gameHistory.aggregate({
    _sum: {
      betAmount: true,
      payout: true
    }
  })
  
  const totalBets = gameHistory._sum.betAmount || 0
  const totalPayouts = gameHistory._sum.payout || 0
  const netProfit = totalBets - totalPayouts

  return {
    houseBankBalance: config.houseBankBalance,
    totalDeposits: deposits._sum.amount || 0,
    playerLiability: liability._sum.credits || 0,
    netProfit
  }
}

export async function updateHouseBank(amount: number, isDeposit: boolean) {
  await requireAdmin()
  let config = await prisma.globalConfig.findUnique({ where: { id: 'default' } })
  if (!config) {
    config = await prisma.globalConfig.create({ data: { id: 'default' } })
  }
  
  const newBalance = isDeposit ? config.houseBankBalance + amount : config.houseBankBalance - amount
  
  await prisma.globalConfig.update({
    where: { id: 'default' },
    data: { houseBankBalance: newBalance }
  })
  
  revalidatePath('/admin')
  return newBalance
}

// ==========================================
// GAME ODDS CONFIGURATION
// ==========================================
export async function updateGameOdds(gameId: string, winRate: number, freeSpinsRate: number) {
  await requireAdmin()
  let config = await prisma.globalConfig.findUnique({ where: { id: 'default' } })
  if (!config) {
    config = await prisma.globalConfig.create({ data: { id: 'default' } })
  }
  const currentOdds = JSON.parse(config.gameOdds || '{}')
  currentOdds[gameId] = { winRate, freeSpinsRate }
  
  await prisma.globalConfig.update({
    where: { id: config.id },
    data: { gameOdds: JSON.stringify(currentOdds) }
  })
  revalidatePath('/admin')
}

// ==========================================
// SPORTSBOOK ADMIN ACTIONS
// ==========================================
export async function updateSportsApiKey(apiKey: string) {
  await requireAdmin()
  let config = await prisma.globalConfig.findUnique({ where: { id: 'default' } })
  if (!config) {
    config = await prisma.globalConfig.create({ data: { id: 'default' } })
  }
  
  await prisma.globalConfig.update({
    where: { id: config.id },
    data: { sportsApiKey: apiKey }
  })
  revalidatePath('/admin')
}

export async function getPendingSportsBets() {
  await requireAdmin()
  // Ensure we have a SportsBet table in prisma! Oh wait, wait. I shouldn't assume SportsBet exists if it was wiped.
  // Actually, I verified earlier that SportsBet model is in schema.prisma.
  return await prisma.sportsBet.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' }
  })
}

export async function resolveSportsBet(betId: string, won: boolean) {
  await requireAdmin()
  const bet = await prisma.sportsBet.findUnique({ where: { id: betId } })
  if (!bet || bet.status !== 'PENDING') throw new Error("Bet not found or already resolved")

  if (won) {
    const payout = Math.floor(bet.amount * bet.odds)
    await prisma.user.update({
      where: { id: bet.userId },
      data: { credits: { increment: payout } }
    })
    await prisma.sportsBet.update({
      where: { id: betId },
      data: { status: 'WON' }
    })
  } else {
    await prisma.sportsBet.update({
      where: { id: betId },
      data: { status: 'LOST' }
    })
  }
  revalidatePath('/admin')
}
