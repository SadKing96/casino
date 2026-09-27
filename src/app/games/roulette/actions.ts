'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { RouletteBet, RouletteBetType, PAYOUTS, getRandomNumber, RED_NUMBERS, BLACK_NUMBERS } from './utils'

export async function getActiveTables() {
  return await prisma.rouletteTable.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function createTable(name: string) {
  return await prisma.rouletteTable.create({
    data: {
      name,
      status: 'BETTING',
      winningNumber: null,
      activeBets: JSON.stringify([]),
      chatHistory: JSON.stringify([{ sender: 'Dealer', text: "Place your bets please!" }])
    }
  })
}

export async function getTableState(tableId: string) {
  return await prisma.rouletteTable.findUnique({ where: { id: tableId } })
}

export async function placeBet(tableId: string, type: RouletteBetType, amount: number) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.chipBalance < amount) throw new Error("Insufficient chips")

  const table = await prisma.rouletteTable.findUnique({ where: { id: tableId } })
  if (!table) throw new Error("Table not found")
  if (table.status !== 'BETTING') throw new Error("No more bets!")

  // Deduct chips
  await prisma.user.update({
    where: { id: userId },
    data: { chipBalance: { decrement: amount } }
  })

  const newBet: RouletteBet = {
    id: `bet_${Date.now()}_${Math.random()}`,
    userId,
    username: user.username,
    type,
    amount,
    isResolved: false
  }

  const activeBets: RouletteBet[] = JSON.parse(table.activeBets)
  activeBets.push(newBet)

  return await prisma.rouletteTable.update({
    where: { id: tableId },
    data: { activeBets: JSON.stringify(activeBets) }
  })
}

export async function spinWheel(tableId: string) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const table = await prisma.rouletteTable.findUnique({ where: { id: tableId } })
  if (!table) throw new Error("Table not found")

  // Random winning number
  const winNumStr = getRandomNumber()
  const winNumInt = parseInt(winNumStr)
  
  const isGreen = winNumStr === '0' || winNumStr === '00'
  const isRed = RED_NUMBERS.includes(winNumStr)
  const isBlack = BLACK_NUMBERS.includes(winNumStr)
  const isEven = !isGreen && winNumInt % 2 === 0
  const isOdd = !isGreen && winNumInt % 2 !== 0

  const activeBets: RouletteBet[] = JSON.parse(table.activeBets)
  const payouts: Record<string, number> = {}

  const win = (bet: RouletteBet, multiplier: number) => {
    bet.isResolved = true
    // You get your bet back + winnings
    bet.wonAmount = (bet.amount * multiplier) + bet.amount
    payouts[bet.userId] = (payouts[bet.userId] || 0) + bet.wonAmount
  }

  const lose = (bet: RouletteBet) => {
    bet.isResolved = true
  }

  // Resolve bets
  for (const bet of activeBets) {
    if (bet.isResolved) continue

    if (bet.type.startsWith('STRAIGHT_UP_')) {
      const num = bet.type.split('_')[2]
      if (num === winNumStr) win(bet, PAYOUTS.STRAIGHT_UP)
      else lose(bet)
    } else {
      switch (bet.type) {
        case '1ST_12':
          if (!isGreen && winNumInt >= 1 && winNumInt <= 12) win(bet, PAYOUTS.DOZENS)
          else lose(bet)
          break;
        case '2ND_12':
          if (!isGreen && winNumInt >= 13 && winNumInt <= 24) win(bet, PAYOUTS.DOZENS)
          else lose(bet)
          break;
        case '3RD_12':
          if (!isGreen && winNumInt >= 25 && winNumInt <= 36) win(bet, PAYOUTS.DOZENS)
          else lose(bet)
          break;
        case '1_TO_18':
          if (!isGreen && winNumInt >= 1 && winNumInt <= 18) win(bet, PAYOUTS.OUTSIDE_EVEN_ODD)
          else lose(bet)
          break;
        case '19_TO_36':
          if (!isGreen && winNumInt >= 19 && winNumInt <= 36) win(bet, PAYOUTS.OUTSIDE_EVEN_ODD)
          else lose(bet)
          break;
        case 'EVEN':
          if (isEven) win(bet, PAYOUTS.OUTSIDE_EVEN_ODD)
          else lose(bet)
          break;
        case 'ODD':
          if (isOdd) win(bet, PAYOUTS.OUTSIDE_EVEN_ODD)
          else lose(bet)
          break;
        case 'RED':
          if (isRed) win(bet, PAYOUTS.OUTSIDE_EVEN_ODD)
          else lose(bet)
          break;
        case 'BLACK':
          if (isBlack) win(bet, PAYOUTS.OUTSIDE_EVEN_ODD)
          else lose(bet)
          break;
        case 'COL_1':
          if (!isGreen && winNumInt % 3 === 1) win(bet, PAYOUTS.COLUMNS)
          else lose(bet)
          break;
        case 'COL_2':
          if (!isGreen && winNumInt % 3 === 2) win(bet, PAYOUTS.COLUMNS)
          else lose(bet)
          break;
        case 'COL_3':
          if (!isGreen && winNumInt % 3 === 0) win(bet, PAYOUTS.COLUMNS)
          else lose(bet)
          break;
        default:
          lose(bet)
      }
    }
  }

  // Remove resolved bets so the board clears
  const remainingBets = activeBets.filter(b => !b.isResolved)

  // Distribute payouts
  for (const [uid, amount] of Object.entries(payouts)) {
    if (amount > 0) {
      await prisma.user.update({
        where: { id: uid },
        data: { chipBalance: { increment: amount } }
      })
    }
  }

  const currentChat = JSON.parse(table.chatHistory || '[]')
  
  // Add winner log
  currentChat.push({ sender: 'Dealer', text: `Winning number is ${winNumStr} ${isGreen ? 'Green' : isRed ? 'Red' : 'Black'}!` })
  
  const payoutEntries = Object.entries(payouts).filter(([uid, amount]) => amount > 0)
  if (payoutEntries.length > 0) {
    const totalPaid = payoutEntries.reduce((sum, [uid, amt]) => sum + amt, 0)
    currentChat.push({ sender: 'Dealer', text: `Paid out $${totalPaid} to winners.` })
  } else {
    currentChat.push({ sender: 'Dealer', text: `House sweeps the board.` })
  }

  // Return the resolved state and reset back to BETTING
  return await prisma.rouletteTable.update({
    where: { id: tableId },
    data: {
      status: 'BETTING',
      winningNumber: winNumStr,
      activeBets: JSON.stringify(remainingBets),
      chatHistory: JSON.stringify(currentChat.slice(-50))
    }
  })
}
