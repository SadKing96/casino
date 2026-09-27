'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { CrashBet, generateCrashPoint, calculateMultiplier, calculateTimeMsForMultiplier } from './utils'

export async function createTable() {
  return await prisma.crashGame.create({
    data: {
      status: 'BETTING',
      crashPoint: 0.0,
      activeBets: "{}"
    }
  })
}

export async function getActiveTables() {
  return await prisma.crashGame.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function getTableState(id: string) {
  return await prisma.crashGame.findUnique({
    where: { id }
  })
}

export async function placeBet(tableId: string, amount: number) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Not logged in")

  const table = await prisma.crashGame.findUnique({ where: { id: tableId } })
  if (!table) throw new Error("Table not found")
  if (table.status !== 'BETTING') throw new Error("Game already in progress")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.chipBalance < amount) throw new Error("Insufficient chips")

  await prisma.user.update({
    where: { id: userId },
    data: { chipBalance: { decrement: amount } }
  })

  const activeBets: Record<string, CrashBet> = JSON.parse(table.activeBets)
  activeBets[userId] = {
    userId,
    amount,
    cashedOut: false,
    cashOutMultiplier: 0,
    profit: 0
  }

  const chatHistory = JSON.parse(table.chatHistory)
  chatHistory.push(`[${new Date().toLocaleTimeString()}] ${user.username} bet $${amount}`)

  await prisma.crashGame.update({
    where: { id: tableId },
    data: {
      activeBets: JSON.stringify(activeBets),
      chatHistory: JSON.stringify(chatHistory.slice(-50))
    }
  })
}

export async function startGame(tableId: string) {
  const table = await prisma.crashGame.findUnique({ where: { id: tableId } })
  if (!table) throw new Error("Table not found")
  if (table.status !== 'BETTING') throw new Error("Already started")

  const point = generateCrashPoint()
  // Add 1.5s delay so frontend can show "Taking off..." before graph starts moving
  const startTime = new Date(Date.now() + 1500).toISOString()

  await prisma.crashGame.update({
    where: { id: tableId },
    data: {
      status: 'IN_FLIGHT',
      crashPoint: point,
      startTime
    }
  })
}

import { logGameHistory } from '@/lib/admin'

export async function cashOut(tableId: string) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Not logged in")

  const table = await prisma.crashGame.findUnique({ where: { id: tableId } })
  if (!table) throw new Error("Table not found")
  if (table.status !== 'IN_FLIGHT') throw new Error("Cannot cash out right now")

  const activeBets: Record<string, CrashBet> = JSON.parse(table.activeBets)
  const bet = activeBets[userId]
  if (!bet) throw new Error("You do not have an active bet")
  if (bet.cashedOut) throw new Error("Already cashed out")

  const startMs = new Date(table.startTime!).getTime()
  const currentMs = Date.now()
  
  // Calculate when it is supposed to crash
  const explodeMs = startMs + calculateTimeMsForMultiplier(table.crashPoint!)
  
  if (currentMs >= explodeMs) {
    throw new Error("Too late, the rocket already crashed!")
  }

  // Valid cashout
  const mult = calculateMultiplier(startMs, currentMs)
  const profit = Math.floor(bet.amount * mult)

  bet.cashedOut = true
  bet.cashOutMultiplier = mult
  bet.profit = profit

  await prisma.user.update({
    where: { id: userId },
    data: { chipBalance: { increment: profit } }
  })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  const chatHistory = JSON.parse(table.chatHistory)
  chatHistory.push(`[${new Date().toLocaleTimeString()}] ${user?.username} cashed out at ${mult.toFixed(2)}x for $${profit}!`)

  await prisma.crashGame.update({
    where: { id: tableId },
    data: {
      activeBets: JSON.stringify(activeBets),
      chatHistory: JSON.stringify(chatHistory.slice(-50))
    }
  })

  await logGameHistory({
    userId,
    gameType: 'CRASH',
    tableId,
    betAmount: bet.amount,
    payout: profit,
    details: { multiplier: mult }
  })

  return { multiplier: mult, profit }
}

export async function resolveGame(tableId: string) {
  const table = await prisma.crashGame.findUnique({ where: { id: tableId } })
  if (!table) throw new Error("Table not found")
  if (table.status !== 'IN_FLIGHT') return // Already resolved or betting

  const chatHistory = JSON.parse(table.chatHistory)
  chatHistory.push(`[${new Date().toLocaleTimeString()}] 💥 CRASHED AT ${table.crashPoint?.toFixed(2)}x 💥`)

  await prisma.crashGame.update({
    where: { id: tableId },
    data: {
      status: 'CRASHED',
      chatHistory: JSON.stringify(chatHistory.slice(-50))
    }
  })
}

export async function clearTable(tableId: string) {
  await prisma.crashGame.update({
    where: { id: tableId },
    data: {
      status: 'BETTING',
      activeBets: "{}",
      crashPoint: 0.0,
      startTime: null
    }
  })
}
