'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { BaccaratBet, BaccaratBetType, createShoe, evaluateBaccaratRound } from './utils'

export async function createTable() {
  return await prisma.baccaratTable.create({
    data: {
      name: `Baccarat Table ${Math.floor(Math.random() * 1000)}`,
      status: 'BETTING'
    }
  })
}

export async function getActiveTables() {
  return await prisma.baccaratTable.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function getTableState(id: string) {
  return await prisma.baccaratTable.findUnique({
    where: { id }
  })
}

export async function placeBet(tableId: string, amount: number, type: BaccaratBetType) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Not logged in")

  const table = await prisma.baccaratTable.findUnique({ where: { id: tableId } })
  if (!table) throw new Error("Table not found")
  if (table.status !== 'BETTING') throw new Error("Bets are closed")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.chipBalance < amount) throw new Error("Insufficient chips")

  // Deduct chips
  await prisma.user.update({
    where: { id: userId },
    data: { chipBalance: { decrement: amount } }
  })

  const activeBets: BaccaratBet[] = JSON.parse(table.activeBets)
  activeBets.push({ userId, type, amount })

  const chatHistory = JSON.parse(table.chatHistory)
  chatHistory.push(`[${new Date().toLocaleTimeString()}] ${user.username} bet $${amount} on ${type}`)

  await prisma.baccaratTable.update({
    where: { id: tableId },
    data: {
      activeBets: JSON.stringify(activeBets),
      chatHistory: JSON.stringify(chatHistory.slice(-50))
    }
  })
}

export async function dealCards(tableId: string) {
  const table = await prisma.baccaratTable.findUnique({ where: { id: tableId } })
  if (!table) throw new Error("Table not found")
  if (table.status !== 'BETTING') throw new Error("Already dealing")

  // Draw cards
  const shoe = createShoe(1)
  const pHand = [shoe.pop()!, shoe.pop()!]
  const bHand = [shoe.pop()!, shoe.pop()!]
  const nextCards = [shoe.pop()!, shoe.pop()!]

  const { playerFinal, bankerFinal, winner } = evaluateBaccaratRound(pHand, bHand, nextCards)

  const activeBets: BaccaratBet[] = JSON.parse(table.activeBets)
  const chatHistory = JSON.parse(table.chatHistory)

  chatHistory.push(`[${new Date().toLocaleTimeString()}] The winner is ${winner}!`)

  // Payouts
  for (const bet of activeBets) {
    if (bet.type === winner) {
      let payout = bet.amount * 2
      if (winner === 'TIE') {
        payout = bet.amount * 9 // Standard 8 to 1 payout = 9x total return
      } else if (winner === 'BANKER') {
        payout = bet.amount * 1.95 // 5% commission on Banker
      }
      
      await prisma.user.update({
        where: { id: bet.userId },
        data: { chipBalance: { increment: Math.floor(payout) } }
      })
      const u = await prisma.user.findUnique({ where: { id: bet.userId } })
      chatHistory.push(`[${new Date().toLocaleTimeString()}] ${u?.username} won $${Math.floor(payout - bet.amount)}!`)
    } else if (winner === 'TIE') {
       // On a TIE, Player and Banker bets push
       if (bet.type === 'PLAYER' || bet.type === 'BANKER') {
          await prisma.user.update({
            where: { id: bet.userId },
            data: { chipBalance: { increment: bet.amount } }
          })
          const u = await prisma.user.findUnique({ where: { id: bet.userId } })
          chatHistory.push(`[${new Date().toLocaleTimeString()}] ${u?.username} PUSH on ${bet.type}`)
       }
    }
  }

  await prisma.baccaratTable.update({
    where: { id: tableId },
    data: {
      status: 'DEALING',
      playerHand: JSON.stringify(playerFinal),
      bankerHand: JSON.stringify(bankerFinal),
      chatHistory: JSON.stringify(chatHistory.slice(-50))
    }
  })
}

export async function clearTable(tableId: string) {
  await prisma.baccaratTable.update({
    where: { id: tableId },
    data: {
      status: 'BETTING',
      activeBets: "[]",
      playerHand: "[]",
      bankerHand: "[]"
    }
  })
}
