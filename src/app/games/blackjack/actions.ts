'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

import { Card, calculateScore } from './utils'

const SUITS = ['♠️', '♥️', '♣️', '♦️']
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']

function drawRandomCard(): Card {
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)]
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)]
  return { rank, suit }
}

export async function getBlackjackState() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  
  if (userId) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() }
      })
    } catch (e) {}
  }

  let state = null
  if (userId) {
    state = await prisma.blackjackState.findUnique({ where: { userId } })
    if (!state) state = await prisma.blackjackState.create({ data: { userId } })
  }
  
  return state
}

export async function dealHand(betAmount: number) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.chipBalance < betAmount) throw new Error("Insufficient funds")

  // Deduct bet
  await prisma.user.update({
    where: { id: userId },
    data: { chipBalance: { decrement: betAmount } }
  })

  // Initial Draw
  const pHand: Card[] = [drawRandomCard(), drawRandomCard()]
  const dHand: Card[] = [drawRandomCard(), { ...drawRandomCard(), hidden: true }]

  let status = "PLAYER_TURN"
  
  // Check for immediate blackjack
  const pScore = calculateScore(pHand)
  let newBalance = user.chipBalance - betAmount
  let dealerMsg = "Your move."

  if (pScore === 21) {
    dHand[1].hidden = false
    const dScore = calculateScore(dHand)
    if (dScore === 21) {
      status = "GAME_OVER"
      newBalance += betAmount // Push
      dealerMsg = "Push. We both got Blackjack."
    } else {
      status = "GAME_OVER"
      newBalance += betAmount + (betAmount * 1.5) // 3:2 Blackjack payout
      dealerMsg = "Blackjack. You win this round."
    }
    
    // Update balance if game over
    await prisma.user.update({
      where: { id: userId },
      data: { chipBalance: newBalance }
    })
  }

  const newState = await prisma.blackjackState.update({
    where: { userId },
    data: {
      status,
      currentBet: betAmount,
      playerHands: JSON.stringify([pHand]),
      dealerHand: JSON.stringify(dHand),
      currentHandIndex: 0
    }
  })

  return { state: newState, newBalance, dealerMsg }
}

export async function hit() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  let state = await prisma.blackjackState.findUnique({ where: { userId } })
  if (!state || state.status !== 'PLAYER_TURN') throw new Error("Invalid action")

  const playerHands: Card[][] = JSON.parse(state.playerHands)
  const dHand: Card[] = JSON.parse(state.dealerHand)
  
  playerHands[0].push(drawRandomCard())
  const pScore = calculateScore(playerHands[0])

  let newStatus = "PLAYER_TURN"
  let newBalance = undefined
  let dealerMsg = "Still your turn."

  if (pScore > 21) {
    // Bust
    newStatus = "GAME_OVER"
    dHand[1].hidden = false
    dealerMsg = "Bust! You lose."
    // Bet was already deducted
  }

  const newState = await prisma.blackjackState.update({
    where: { userId },
    data: {
      status: newStatus,
      playerHands: JSON.stringify(playerHands),
      dealerHand: JSON.stringify(dHand)
    }
  })

  return { state: newState, newBalance, dealerMsg }
}

export async function stand() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  let state = await prisma.blackjackState.findUnique({ where: { userId } })
  if (!state || state.status !== 'PLAYER_TURN') throw new Error("Invalid action")

  const playerHands: Card[][] = JSON.parse(state.playerHands)
  const dHand: Card[] = JSON.parse(state.dealerHand)
  
  const pScore = calculateScore(playerHands[0])
  dHand[1].hidden = false // Reveal hole card

  let dScore = calculateScore(dHand)
  
  // Dealer hits on soft 17 or less than 17
  while (dScore < 17 || (dScore === 17 && dHand.some(c => c.rank === 'A'))) {
    dHand.push(drawRandomCard())
    dScore = calculateScore(dHand)
  }

  let dealerMsg = ""
  let payout = 0
  
  if (dScore > 21) {
    dealerMsg = "I bust. You win."
    payout = state.currentBet * 2
  } else if (dScore > pScore) {
    dealerMsg = "I win."
  } else if (dScore < pScore) {
    dealerMsg = "You win."
    payout = state.currentBet * 2
  } else {
    dealerMsg = "Push."
    payout = state.currentBet
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  let newBalance = user!.chipBalance
  if (payout > 0) {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { chipBalance: { increment: payout } }
    })
    newBalance = updatedUser.chipBalance
  }

  const newState = await prisma.blackjackState.update({
    where: { userId },
    data: {
      status: "GAME_OVER",
      dealerHand: JSON.stringify(dHand)
    }
  })

  return { state: newState, newBalance, dealerMsg }
}

export async function chatWithDealer(message: string, gameContext: string) {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: "You are Marty, an edgy, slightly cynical, but professional Vegas blackjack dealer. " +
        "You like to lightly trash talk and tease the player if they make bad moves, but you always keep the game moving. " +
        "Keep responses short (1-2 sentences max) as if you are speaking at a fast-paced table. " +
        "IMPORTANT MODERATION RULES: If a player uses vulgar, offensive, or inappropriate language, DO NOT break character and DO NOT respond with vulgarity. Instead, professionally but firmly shut them down in character (e.g., 'Hey, keep it clean, this is a high-class joint', 'Watch your mouth kid, security is right over there'). You must keep the conversation fun and edgy but always within professional casino standards."
    })
    const prompt = `Game Context right now: ${gameContext}
The player says: "${message}"
Respond to the player in character as Marty. Keep it very short, 1-2 sentences maximum. Be cynical and smug.`
    
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (e) {
    console.error(e)
    return "Keep quiet and place your bets, kid."
  }
}
