'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { KenoBet, drawKenoNumbers, calculateKenoPayout } from './utils'

export async function createTable() {
  return await prisma.kenoGame.create({
    data: {
      status: 'BETTING'
    }
  })
}

export async function getActiveTables() {
  return await prisma.kenoGame.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function getTableState(id: string) {
  return await prisma.kenoGame.findUnique({
    where: { id }
  })
}

export async function placeBet(tableId: string, amount: number, selectedNumbers: number[]) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Not logged in")
  if (selectedNumbers.length < 1 || selectedNumbers.length > 10) throw new Error("Must select 1-10 numbers")

  const table = await prisma.kenoGame.findUnique({ where: { id: tableId } })
  if (!table) throw new Error("Table not found")
  if (table.status !== 'BETTING') throw new Error("Game already drawing")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.chipBalance < amount) throw new Error("Insufficient chips")

  await prisma.user.update({
    where: { id: userId },
    data: { chipBalance: { decrement: amount } }
  })

  const activeBets: Record<string, KenoBet> = JSON.parse(table.activeBets)
  activeBets[userId] = {
    userId,
    amount,
    selectedNumbers,
    profit: 0,
    hits: 0
  }

  await prisma.kenoGame.update({
    where: { id: tableId },
    data: {
      activeBets: JSON.stringify(activeBets)
    }
  })
}

export async function drawNumbers(tableId: string) {
  const table = await prisma.kenoGame.findUnique({ where: { id: tableId } })
  if (!table) throw new Error("Table not found")
  if (table.status !== 'BETTING') throw new Error("Already drawn")

  const drawn = drawKenoNumbers()
  const drawnSet = new Set(drawn)
  const activeBets: Record<string, KenoBet> = JSON.parse(table.activeBets)

  for (const uid in activeBets) {
    const bet = activeBets[uid]
    const hits = bet.selectedNumbers.filter(n => drawnSet.has(n)).length
    const mult = calculateKenoPayout(bet.selectedNumbers.length, hits)
    const profit = Math.floor(bet.amount * mult)
    
    bet.hits = hits
    bet.profit = profit

    if (profit > 0) {
      await prisma.user.update({
        where: { id: uid },
        data: { chipBalance: { increment: profit } }
      })
    }
  }

  await prisma.kenoGame.update({
    where: { id: tableId },
    data: {
      status: 'DRAWN',
      drawnNumbers: JSON.stringify(drawn),
      activeBets: JSON.stringify(activeBets)
    }
  })
}

export async function clearTable(tableId: string) {
  await prisma.kenoGame.update({
    where: { id: tableId },
    data: {
      status: 'BETTING',
      activeBets: "{}",
      drawnNumbers: "[]"
    }
  })
}
