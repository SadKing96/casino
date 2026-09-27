'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { Card, PlayerState, createDeck, evaluate3CardHand, dealerQualifies, compareHands, calculatePairPlusPayout, calculateAnteBonus } from './utils'

export async function createTable() {
  return await prisma.threeCardPokerTable.create({
    data: {
      name: `3 Card Poker Table ${Math.floor(Math.random() * 1000)}`,
      status: 'ANTE'
    }
  })
}

export async function getActiveTables() {
  return await prisma.threeCardPokerTable.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function getTableState(id: string) {
  return await prisma.threeCardPokerTable.findUnique({
    where: { id }
  })
}

export async function placeAnte(tableId: string, anteAmount: number, pairPlusAmount: number) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Not logged in")

  const table = await prisma.threeCardPokerTable.findUnique({ where: { id: tableId } })
  if (!table) throw new Error("Table not found")
  if (table.status !== 'ANTE') throw new Error("Bets are closed")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  const totalBet = anteAmount + pairPlusAmount
  if (!user || user.chipBalance < totalBet) throw new Error("Insufficient chips")

  await prisma.user.update({
    where: { id: userId },
    data: { chipBalance: { decrement: totalBet } }
  })

  const playerHands: Record<string, PlayerState> = JSON.parse(table.playerHands)
  playerHands[userId] = {
    hand: [],
    betAnte: anteAmount,
    betPairPlus: pairPlusAmount,
    betPlay: 0,
    status: 'WAITING',
    payout: 0
  }

  const chatHistory = JSON.parse(table.chatHistory)
  chatHistory.push(`[${new Date().toLocaleTimeString()}] ${user.username} placed Ante $${anteAmount}${pairPlusAmount > 0 ? ` and Pair Plus $${pairPlusAmount}` : ''}`)

  await prisma.threeCardPokerTable.update({
    where: { id: tableId },
    data: {
      playerHands: JSON.stringify(playerHands),
      chatHistory: JSON.stringify(chatHistory.slice(-50))
    }
  })
}

export async function dealCards(tableId: string) {
  const table = await prisma.threeCardPokerTable.findUnique({ where: { id: tableId } })
  if (!table) throw new Error("Table not found")
  if (table.status !== 'ANTE') throw new Error("Already dealing")

  const playerHands: Record<string, PlayerState> = JSON.parse(table.playerHands)
  if (Object.keys(playerHands).length === 0) throw new Error("No players placed an ante")

  const deck = createDeck()
  
  // Deal to dealer
  const dealerHand = [deck.pop()!, deck.pop()!, deck.pop()!]
  
  // Deal to players
  for (const uid in playerHands) {
    playerHands[uid].hand = [deck.pop()!, deck.pop()!, deck.pop()!]
  }

  const chatHistory = JSON.parse(table.chatHistory)
  chatHistory.push(`[${new Date().toLocaleTimeString()}] Cards dealt. Place your Play bets!`)

  await prisma.threeCardPokerTable.update({
    where: { id: tableId },
    data: {
      status: 'PLAY',
      dealerHand: JSON.stringify(dealerHand),
      playerHands: JSON.stringify(playerHands),
      chatHistory: JSON.stringify(chatHistory.slice(-50))
    }
  })
}

export async function placePlayBet(tableId: string) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Not logged in")

  const table = await prisma.threeCardPokerTable.findUnique({ where: { id: tableId } })
  if (!table) throw new Error("Table not found")
  if (table.status !== 'PLAY') throw new Error("Not the time to play")

  const playerHands: Record<string, PlayerState> = JSON.parse(table.playerHands)
  const pState = playerHands[userId]
  if (!pState || pState.status !== 'WAITING') throw new Error("Cannot play")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.chipBalance < pState.betAnte) throw new Error("Insufficient chips for Play bet")

  // Deduct play bet
  await prisma.user.update({
    where: { id: userId },
    data: { chipBalance: { decrement: pState.betAnte } }
  })

  pState.betPlay = pState.betAnte
  pState.status = 'PLAY'
  
  const chatHistory = JSON.parse(table.chatHistory)
  chatHistory.push(`[${new Date().toLocaleTimeString()}] ${user.username} placed Play bet of $${pState.betPlay}`)

  await prisma.threeCardPokerTable.update({
    where: { id: tableId },
    data: {
      playerHands: JSON.stringify(playerHands),
      chatHistory: JSON.stringify(chatHistory.slice(-50))
    }
  })
}

export async function foldHand(tableId: string) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Not logged in")

  const table = await prisma.threeCardPokerTable.findUnique({ where: { id: tableId } })
  if (!table) throw new Error("Table not found")
  if (table.status !== 'PLAY') throw new Error("Not the time to fold")

  const playerHands: Record<string, PlayerState> = JSON.parse(table.playerHands)
  const pState = playerHands[userId]
  if (!pState || pState.status !== 'WAITING') throw new Error("Cannot fold")

  pState.status = 'FOLD'

  const user = await prisma.user.findUnique({ where: { id: userId } })
  const chatHistory = JSON.parse(table.chatHistory)
  chatHistory.push(`[${new Date().toLocaleTimeString()}] ${user?.username} folded.`)

  await prisma.threeCardPokerTable.update({
    where: { id: tableId },
    data: {
      playerHands: JSON.stringify(playerHands),
      chatHistory: JSON.stringify(chatHistory.slice(-50))
    }
  })
}

export async function resolveRound(tableId: string) {
  const table = await prisma.threeCardPokerTable.findUnique({ where: { id: tableId } })
  if (!table) throw new Error("Table not found")
  if (table.status !== 'PLAY') throw new Error("Game is not in play state")

  const dealerHand: Card[] = JSON.parse(table.dealerHand)
  const playerHands: Record<string, PlayerState> = JSON.parse(table.playerHands)
  const chatHistory = JSON.parse(table.chatHistory)

  const dQualifies = dealerQualifies(dealerHand)
  const evalDealer = evaluate3CardHand(dealerHand)

  chatHistory.push(`[${new Date().toLocaleTimeString()}] Dealer reveals: ${evalDealer.name}. Qualifies: ${dQualifies ? 'YES' : 'NO'}`)

  for (const uid in playerHands) {
    const pState = playerHands[uid]
    if (pState.status === 'WAITING') {
      // Auto fold if they didn't act
      pState.status = 'FOLD'
    }

    let payout = 0
    const evalPlayer = evaluate3CardHand(pState.hand)

    // 1. Pair Plus (always evaluates if bet > 0, even if folded or dealer doesn't qualify)
    if (pState.betPairPlus > 0) {
      const ppMult = calculatePairPlusPayout(evalPlayer.rank)
      if (ppMult > 0) {
        payout += pState.betPairPlus + (pState.betPairPlus * ppMult)
      }
    }

    // 2. Ante Bonus (always evaluates if played, regardless of dealer qualification)
    if (pState.status === 'PLAY') {
      const anteBonusMult = calculateAnteBonus(evalPlayer.rank)
      if (anteBonusMult > 0) {
        payout += pState.betAnte * anteBonusMult
      }
    }

    // 3. Play & Ante Resolution
    if (pState.status === 'PLAY') {
      if (!dQualifies) {
        // Play pushes, Ante pays 1:1
        payout += pState.betPlay // push play
        payout += pState.betAnte * 2 // ante 1:1 + original
      } else {
        const comp = compareHands(evalPlayer, evalDealer)
        if (comp > 0) { // Player wins
          payout += pState.betPlay * 2
          payout += pState.betAnte * 2
        } else if (comp === 0) { // Tie
          payout += pState.betPlay
          payout += pState.betAnte
        } else { // Dealer wins
          // payout += 0
        }
      }
    }

    pState.payout = payout
    pState.status = 'RESOLVED'

    if (payout > 0) {
      await prisma.user.update({
        where: { id: uid },
        data: { chipBalance: { increment: payout } }
      })
      const u = await prisma.user.findUnique({ where: { id: uid } })
      chatHistory.push(`[${new Date().toLocaleTimeString()}] ${u?.username} won $${payout}!`)
    }
  }

  await prisma.threeCardPokerTable.update({
    where: { id: tableId },
    data: {
      status: 'RESOLVE',
      playerHands: JSON.stringify(playerHands),
      chatHistory: JSON.stringify(chatHistory.slice(-50))
    }
  })
}

export async function clearTable(tableId: string) {
  await prisma.threeCardPokerTable.update({
    where: { id: tableId },
    data: {
      status: 'ANTE',
      dealerHand: "[]",
      playerHands: "{}"
    }
  })
}
