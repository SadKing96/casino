'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { generateDeck, Card, PlayerState, evaluateBestHand } from './utils'
import { GoogleGenerativeAI } from '@google/generative-ai'
import * as PokerSolver from 'pokersolver'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function getActiveTables() {
  return await prisma.holdemTable.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function createTable(name: string) {
  const table = await prisma.holdemTable.create({
    data: {
      name,
      status: 'LOBBY',
      players: JSON.stringify([]),
      communityCards: JSON.stringify([]),
      chatHistory: JSON.stringify([{ sender: 'Rusty', text: "Table open. Take a seat." }])
    }
  })
  return table
}

export async function joinTable(tableId: string) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error("User not found")

  const table = await prisma.holdemTable.findUnique({ where: { id: tableId } })
  if (!table) throw new Error("Table not found")

  let players: PlayerState[] = JSON.parse(table.players)
  
  // Check if user is already sitting
  if (!players.find(p => p.id === userId)) {
    if (players.filter(p => !p.isBot).length >= 5) {
      throw new Error("Table is full of humans")
    }
    
    // Add human to the table
    players.push({
      id: userId,
      name: user.username,
      chips: user.chipBalance,
      cards: [],
      currentBet: 0,
      status: 'ACTIVE',
      isBot: false
    })

    await prisma.holdemTable.update({
      where: { id: tableId },
      data: { players: JSON.stringify(players) }
    })
  }

  return await getTableState(tableId)
}

export async function getTableState(tableId: string) {
  return await prisma.holdemTable.findUnique({ where: { id: tableId } })
}

const BLIND_SMALL = 10
const BLIND_BIG = 20

export async function dealHand(tableId: string) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  let state = await prisma.holdemTable.findUnique({ where: { id: tableId } })
  if (!state) throw new Error("Game not found")

  let players: PlayerState[] = JSON.parse(state.players)
  
  // Fill empty seats with bots if needed
  const botsNeeded = 5 - players.length
  if (botsNeeded > 0) {
    const botNames = ['Tex', 'Lucky', 'Slim', 'Ace', 'Duke']
    for (let i = 0; i < botsNeeded; i++) {
      players.push({
        id: `bot_${Date.now()}_${i}`,
        name: botNames[i % botNames.length],
        chips: 1000,
        cards: [],
        currentBet: 0,
        status: 'ACTIVE',
        isBot: true
      })
    }
  }

  // Sync human chips from DB
  for (let p of players) {
    if (!p.isBot) {
      const u = await prisma.user.findUnique({ where: { id: p.id } })
      if (u) p.chips = u.chipBalance
    }
  }

  players.forEach(p => {
    p.cards = []
    p.currentBet = 0
    p.status = p.chips <= 0 ? 'OUT' : 'ACTIVE'
  })

  const activePlayers = players.filter(p => p.status === 'ACTIVE')
  if (activePlayers.length < 2) throw new Error("Not enough players with chips")

  // Move dealer button
  let nextDealer = (state.dealerButtonIndex + 1) % players.length
  while (players[nextDealer].status !== 'ACTIVE') {
    nextDealer = (nextDealer + 1) % players.length
  }
  
  // Blinds
  let sbIndex = (nextDealer + 1) % players.length
  while (players[sbIndex].status !== 'ACTIVE') sbIndex = (sbIndex + 1) % players.length
  
  let bbIndex = (sbIndex + 1) % players.length
  while (players[bbIndex].status !== 'ACTIVE') bbIndex = (bbIndex + 1) % players.length

  // Deduct blinds
  players[sbIndex].chips -= BLIND_SMALL
  players[sbIndex].currentBet = BLIND_SMALL
  if (!players[sbIndex].isBot) {
    await prisma.user.update({ where: { id: players[sbIndex].id }, data: { chipBalance: { decrement: BLIND_SMALL } } })
  }

  players[bbIndex].chips -= BLIND_BIG
  players[bbIndex].currentBet = BLIND_BIG
  if (!players[bbIndex].isBot) {
    await prisma.user.update({ where: { id: players[bbIndex].id }, data: { chipBalance: { decrement: BLIND_BIG } } })
  }

  const pot = BLIND_SMALL + BLIND_BIG
  const highestBet = BLIND_BIG

  // Deal cards
  const deck = generateDeck()
  for (let i = 0; i < 2; i++) {
    players.forEach(p => {
      if (p.status === 'ACTIVE') {
        const c = deck.pop()!
        // We do NOT hide bot cards in the server state if we want true secure multiplayer, 
        // but for now we just flag them as hidden so the client renders them hidden
        p.cards.push(p.isBot ? { ...c, hidden: true } : c)
      }
    })
  }
  
  const board = [deck.pop()!, deck.pop()!, deck.pop()!, deck.pop()!, deck.pop()!]

  let turnIndex = (bbIndex + 1) % players.length
  while (players[turnIndex].status !== 'ACTIVE') turnIndex = (turnIndex + 1) % players.length

  state = await prisma.holdemTable.update({
    where: { id: state.id },
    data: {
      status: 'PRE_FLOP',
      players: JSON.stringify(players),
      communityCards: JSON.stringify(board),
      potAmount: pot,
      currentBet: highestBet,
      dealerButtonIndex: nextDealer,
      currentTurnIndex: turnIndex
    }
  })

  return await processAiTurns(state, userId)
}

export async function processAiTurns(state: any, callerUserId: string) {
  let players: PlayerState[] = JSON.parse(state.players)
  let turnIndex = state.currentTurnIndex
  let currentBet = state.currentBet
  let pot = state.potAmount
  let status = state.status

  while (status !== 'LOBBY' && status !== 'GAME_OVER' && players[turnIndex].isBot && players[turnIndex].status === 'ACTIVE') {
    const bot = players[turnIndex]
    const amountToCall = currentBet - bot.currentBet

    if (amountToCall > 0) {
      if (Math.random() > 0.8 && amountToCall > 50) {
        bot.status = 'FOLDED'
      } else {
        const callAmt = Math.min(bot.chips, amountToCall)
        bot.chips -= callAmt
        bot.currentBet += callAmt
        pot += callAmt
      }
    }

    turnIndex = (turnIndex + 1) % players.length
    while (players[turnIndex].status !== 'ACTIVE' && players[turnIndex].status !== 'ALL_IN') {
      turnIndex = (turnIndex + 1) % players.length
    }

    if (isBettingRoundOver(players, currentBet, turnIndex)) {
      const nextRes = advanceStreet(players, pot, status)
      players = nextRes.players
      pot = nextRes.pot
      status = nextRes.status
      turnIndex = nextRes.turnIndex
      currentBet = nextRes.currentBet
      
      if (status === 'SHOWDOWN') {
        return await resolveShowdown(state.id, players, JSON.parse(state.communityCards), pot, callerUserId)
      }
    }
  }

  const finalState = await prisma.holdemTable.update({
    where: { id: state.id },
    data: {
      players: JSON.stringify(players),
      potAmount: pot,
      currentBet,
      currentTurnIndex: turnIndex,
      status
    }
  })

  const newBalance = players.find(p => p.id === callerUserId)?.chips
  return { state: finalState, newBalance }
}

function isBettingRoundOver(players: PlayerState[], highestBet: number, turnIndex: number) {
  const active = players.filter(p => p.status === 'ACTIVE')
  if (active.length <= 1) return true
  const allMatched = active.every(p => p.currentBet === highestBet)
  return allMatched
}

function advanceStreet(players: PlayerState[], pot: number, status: string) {
  players.forEach(p => p.currentBet = 0)
  
  let nextStatus = status
  if (status === 'PRE_FLOP') nextStatus = 'FLOP'
  else if (status === 'FLOP') nextStatus = 'TURN'
  else if (status === 'TURN') nextStatus = 'RIVER'
  else if (status === 'RIVER') nextStatus = 'SHOWDOWN'

  let turnIndex = 0
  while (players[turnIndex].status !== 'ACTIVE') turnIndex = (turnIndex + 1) % players.length
  
  return { players, pot, status: nextStatus, turnIndex, currentBet: 0 }
}

async function resolveShowdown(tableId: string, players: PlayerState[], communityCards: Card[], pot: number, callerUserId: string) {
  players.forEach(p => {
    if (p.isBot && p.status !== 'FOLDED') {
      p.cards.forEach(c => c.hidden = false)
    }
  })
  
  const active = players.filter(p => p.status !== 'FOLDED')
  let winner = active[0]
  
  if (active.length > 1) {
    const hands = active.map(p => {
      const hand = evaluateBestHand(p.cards, communityCards)
      // @ts-ignore
      hand.player = p
      return hand
    })
    
    // @ts-ignore
    const winningHands = PokerSolver.Hand.winners(hands)
    winner = winningHands[0].player
  }
  
  winner.chips += pot
  if (!winner.isBot) {
    await prisma.user.update({ where: { id: winner.id }, data: { chipBalance: { increment: pot } } })
  }

  const finalState = await prisma.holdemTable.update({
    where: { id: tableId },
    data: {
      status: 'GAME_OVER',
      players: JSON.stringify(players),
      potAmount: pot,
      communityCards: JSON.stringify(communityCards)
    }
  })

  return { state: finalState, newBalance: players.find(p => p.id === callerUserId)?.chips }
}

export async function playerAction(tableId: string, action: 'FOLD' | 'CALL' | 'RAISE', amount?: number) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  let state = await prisma.holdemTable.findUnique({ where: { id: tableId } })
  if (!state) throw new Error("Game not found")

  const players: PlayerState[] = JSON.parse(state.players)
  const human = players.find(p => p.id === userId)
  if (!human) throw new Error("You are not at this table")
  
  if (state.currentTurnIndex !== players.indexOf(human)) throw new Error("Not your turn")

  let pot = state.potAmount
  let currentBet = state.currentBet
  let turnIndex = state.currentTurnIndex

  if (action === 'FOLD') {
    human.status = 'FOLDED'
  } else if (action === 'CALL') {
    const callAmt = Math.min(human.chips, currentBet - human.currentBet)
    human.chips -= callAmt
    human.currentBet += callAmt
    pot += callAmt
    await prisma.user.update({ where: { id: userId }, data: { chipBalance: { decrement: callAmt } } })
  } else if (action === 'RAISE') {
    const raiseAmt = amount || (currentBet + 20)
    const callAmt = currentBet - human.currentBet
    const totalDeduct = callAmt + raiseAmt
    if (human.chips < totalDeduct) throw new Error("Not enough chips")
    
    human.chips -= totalDeduct
    human.currentBet += totalDeduct
    currentBet = human.currentBet
    pot += totalDeduct
    await prisma.user.update({ where: { id: userId }, data: { chipBalance: { decrement: totalDeduct } } })
  }

  turnIndex = (turnIndex + 1) % players.length
  while (players[turnIndex].status !== 'ACTIVE' && players[turnIndex].status !== 'ALL_IN') {
    turnIndex = (turnIndex + 1) % players.length
  }

  state = await prisma.holdemTable.update({
    where: { id: state.id },
    data: { players: JSON.stringify(players), potAmount: pot, currentBet, currentTurnIndex: turnIndex }
  })

  if (isBettingRoundOver(players, currentBet, turnIndex)) {
    const nextRes = advanceStreet(players, pot, state.status)
    state = await prisma.holdemTable.update({
      where: { id: state.id },
      data: {
        players: JSON.stringify(nextRes.players), potAmount: nextRes.pot, 
        status: nextRes.status,
        currentTurnIndex: nextRes.turnIndex, currentBet: nextRes.currentBet
      }
    })
    if (nextRes.status === 'SHOWDOWN') {
      return await resolveShowdown(state.id, nextRes.players, JSON.parse(state.communityCards), nextRes.pot, userId)
    }
  }

  return await processAiTurns(state, userId)
}

export async function chatWithDealer(message: string, gameContext: string) {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: "You are Rusty, a rage-baiting, obnoxious, slightly aggressive Texas Hold'em casino dealer."
    })
    const prompt = `Game Context right now: ${gameContext}\nThe player says: "${message}"\nRespond to the player in character as Rusty. Keep it very short, 1-2 sentences maximum. Be insulting but professional.`
    
    const result = await model.generateContent(prompt)
    return result.response.text() || "Yeah, whatever."
  } catch (error) {
    console.error("Gemini Error:", error)
    return "I'm not talkin' right now."
  }
}
