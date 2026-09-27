'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { CrapsBet, CrapsBetType, PAYOUTS, rollTwoDice } from './utils'

export async function getActiveTables() {
  return await prisma.crapsTable.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function createTable(name: string) {
  return await prisma.crapsTable.create({
    data: {
      name,
      status: 'OFF',
      dice: JSON.stringify([3, 4]),
      activeBets: JSON.stringify([]),
      chatHistory: JSON.stringify([{ sender: 'Stickman', text: "New shooter coming out!" }])
    }
  })
}

export async function getTableState(tableId: string) {
  return await prisma.crapsTable.findUnique({ where: { id: tableId } })
}

export async function placeBet(tableId: string, type: CrapsBetType, amount: number) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.chipBalance < amount) throw new Error("Insufficient chips")

  const table = await prisma.crapsTable.findUnique({ where: { id: tableId } })
  if (!table) throw new Error("Table not found")

  // Deduct chips immediately
  await prisma.user.update({
    where: { id: userId },
    data: { chipBalance: { decrement: amount } }
  })

  const newBet: CrapsBet = {
    id: `bet_${Date.now()}_${Math.random()}`,
    userId,
    username: user.username,
    type,
    amount,
    isResolved: false
  }

  const activeBets: CrapsBet[] = JSON.parse(table.activeBets)
  activeBets.push(newBet)

  return await prisma.crapsTable.update({
    where: { id: tableId },
    data: { activeBets: JSON.stringify(activeBets) }
  })
}

export async function rollDice(tableId: string) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const table = await prisma.crapsTable.findUnique({ where: { id: tableId } })
  if (!table) throw new Error("Table not found")

  const [d1, d2] = rollTwoDice()
  const total = d1 + d2
  const isHard = d1 === d2
  const diceJson = JSON.stringify([d1, d2])

  let newStatus = table.status
  let newPoint = table.point

  const activeBets: CrapsBet[] = JSON.parse(table.activeBets)
  
  // Track payouts to apply to users
  const payouts: Record<string, number> = {}

  // Function to credit user
  const win = (bet: CrapsBet, multiplier: number, keepOriginal: boolean = true) => {
    bet.isResolved = true
    bet.wonAmount = Math.floor(bet.amount * multiplier) + (keepOriginal ? bet.amount : 0)
    payouts[bet.userId] = (payouts[bet.userId] || 0) + bet.wonAmount
  }

  const lose = (bet: CrapsBet) => {
    bet.isResolved = true
  }

  const push = (bet: CrapsBet) => {
    bet.isResolved = true
    payouts[bet.userId] = (payouts[bet.userId] || 0) + bet.amount // return original bet
  }

  // Resolve bets
  for (const bet of activeBets) {
    if (bet.isResolved) continue;

    switch (bet.type) {
      case 'PASS_LINE':
        if (table.status === 'OFF') {
          if (total === 7 || total === 11) win(bet, PAYOUTS.PASS_LINE)
          else if (total === 2 || total === 3 || total === 12) lose(bet)
          // Else, point is established, bet stays.
        } else {
          if (total === table.point) win(bet, PAYOUTS.PASS_LINE)
          else if (total === 7) lose(bet)
        }
        break;
      case 'DONT_PASS':
        if (table.status === 'OFF') {
          if (total === 2 || total === 3) win(bet, PAYOUTS.DONT_PASS)
          else if (total === 12) push(bet)
          else if (total === 7 || total === 11) lose(bet)
        } else {
          if (total === 7) win(bet, PAYOUTS.DONT_PASS)
          else if (total === table.point) lose(bet)
        }
        break;
      case 'COME':
        if (!bet.point) {
          if (total === 7 || total === 11) win(bet, PAYOUTS.COME)
          else if (total === 2 || total === 3 || total === 12) lose(bet)
          else bet.point = total // travels to point
        } else {
          if (total === bet.point) win(bet, PAYOUTS.COME)
          else if (total === 7) lose(bet)
        }
        break;
      case 'DONT_COME':
        if (!bet.point) {
          if (total === 2 || total === 3) win(bet, PAYOUTS.DONT_COME)
          else if (total === 12) push(bet)
          else if (total === 7 || total === 11) lose(bet)
          else bet.point = total
        } else {
          if (total === 7) win(bet, PAYOUTS.DONT_COME)
          else if (total === bet.point) lose(bet)
        }
        break;
      case 'FIELD':
        if (total === 2 || total === 12) win(bet, 2) // Pays double
        else if ([3,4,9,10,11].includes(total)) win(bet, PAYOUTS.FIELD)
        else lose(bet)
        break;
      case 'PLACE_4':
        if (total === 4) win(bet, PAYOUTS.PLACE_4)
        else if (total === 7) lose(bet)
        break;
      case 'PLACE_5':
        if (total === 5) win(bet, PAYOUTS.PLACE_5)
        else if (total === 7) lose(bet)
        break;
      case 'PLACE_6':
        if (total === 6) win(bet, PAYOUTS.PLACE_6)
        else if (total === 7) lose(bet)
        break;
      case 'PLACE_8':
        if (total === 8) win(bet, PAYOUTS.PLACE_8)
        else if (total === 7) lose(bet)
        break;
      case 'PLACE_9':
        if (total === 9) win(bet, PAYOUTS.PLACE_9)
        else if (total === 7) lose(bet)
        break;
      case 'PLACE_10':
        if (total === 10) win(bet, PAYOUTS.PLACE_10)
        else if (total === 7) lose(bet)
        break;
      case 'HARD_4':
        if (total === 4 && isHard) win(bet, PAYOUTS.HARD_4)
        else if (total === 4 || total === 7) lose(bet)
        break;
      case 'HARD_6':
        if (total === 6 && isHard) win(bet, PAYOUTS.HARD_6)
        else if (total === 6 || total === 7) lose(bet)
        break;
      case 'HARD_8':
        if (total === 8 && isHard) win(bet, PAYOUTS.HARD_8)
        else if (total === 8 || total === 7) lose(bet)
        break;
      case 'HARD_10':
        if (total === 10 && isHard) win(bet, PAYOUTS.HARD_10)
        else if (total === 10 || total === 7) lose(bet)
        break;
      case 'ANY_SEVEN':
        if (total === 7) win(bet, PAYOUTS.ANY_SEVEN)
        else lose(bet)
        break;
      case 'ANY_CRAPS':
        if (total === 2 || total === 3 || total === 12) win(bet, PAYOUTS.ANY_CRAPS)
        else lose(bet)
        break;
    }
  }

  // Update Game State
  if (table.status === 'OFF') {
    if ([4,5,6,8,9,10].includes(total)) {
      newStatus = 'ON'
      newPoint = total
    }
  } else {
    if (total === 7 || total === table.point) {
      newStatus = 'OFF'
      newPoint = null
    }
  }

  // Filter out resolved bets so they get removed from the table visually
  const remainingBets = activeBets.filter(b => !b.isResolved)

  // Apply Payouts to Users
  for (const [uid, amount] of Object.entries(payouts)) {
    if (amount > 0) {
      await prisma.user.update({
        where: { id: uid },
        data: { chipBalance: { increment: amount } }
      })
    }
  }

  let shooterMsg = `Rolled a ${total}!`
  if (table.status === 'ON' && total === 7) shooterMsg = "Seven Out! Pass the dice."
  if (table.status === 'OFF' && [4,5,6,8,9,10].includes(total)) shooterMsg = `The point is ${total}!`
  
  const currentChat = JSON.parse(table.chatHistory || '[]')
  currentChat.push({ sender: 'Stickman', text: shooterMsg })

  // Log payouts
  const payoutEntries = Object.entries(payouts).filter(([uid, amount]) => amount > 0)
  if (payoutEntries.length > 0) {
    const totalPaid = payoutEntries.reduce((sum, [uid, amt]) => sum + amt, 0)
    currentChat.push({ sender: 'Dealer', text: `Paid out $${totalPaid} to winners.` })
  }

  return await prisma.crapsTable.update({
    where: { id: tableId },
    data: {
      status: newStatus,
      point: newPoint,
      dice: diceJson,
      activeBets: JSON.stringify(remainingBets),
      shooterId: userId,
      chatHistory: JSON.stringify(currentChat.slice(-50))
    }
  })
}
