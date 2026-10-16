'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { recordWallet } from '@/lib/wallet'
import { Card, calculateScore, generateShoe, drawCards, evaluate21Plus3, evaluatePerfectPairs, evaluateLuckyLadies, evaluateBustIt } from './utils'

export type Hand = {
  id: string
  cards: Card[]
  bet: number
  status: 'PLAYING' | 'STAND' | 'BUST' | 'BLACKJACK' | 'SURRENDER' | 'RESOLVED'
  payout: number
  doubleDown: boolean
}

export type PlayerState = {
  username: string
  seatIndex: number
  status: 'SITTING' | 'BETTING' | 'READY' | 'PLAYING' | 'SKIPPED' | 'RESOLVED'
  hands: Hand[]
  insuranceBet: number
  sideBets: {
    twentyOnePlusThree: number
    perfectPairs: number
    luckyLadies: number
    bustIt: number
  }
}

export async function createTable(tableName: string) {
  return await prisma.blackjackTable.create({
    data: {
      name: tableName || `Blackjack Table ${Math.floor(Math.random() * 1000)}`,
      status: 'BETTING'
    }
  })
}

export async function getActiveTables() {
  return await prisma.blackjackTable.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function getTableState(id: string) {
  return await prisma.blackjackTable.findUnique({ where: { id } })
}

export async function joinTable(tableId: string, seatIndex: number) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const table = await prisma.blackjackTable.findUnique({ where: { id: tableId } })
  if (!table) throw new Error("Table not found")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error("User not found")

  const playerStates: Record<string, PlayerState> = JSON.parse(table.playerStates || '{}')
  
  if (playerStates[userId]) throw new Error("Already at table")
  if (Object.values(playerStates).some(p => p.seatIndex === seatIndex)) throw new Error("Seat taken")

  playerStates[userId] = {
    username: user.username,
    seatIndex,
    status: 'SITTING',
    hands: [],
    insuranceBet: 0,
    sideBets: { twentyOnePlusThree: 0, perfectPairs: 0, luckyLadies: 0, bustIt: 0 }
  }

  const chatHistory = JSON.parse(table.chatHistory || '[]')
  chatHistory.push(`[${new Date().toLocaleTimeString()}] ${user.username} sat at seat ${seatIndex + 1}`)

  await prisma.blackjackTable.update({
    where: { id: tableId },
    data: {
      playerStates: JSON.stringify(playerStates),
      chatHistory: JSON.stringify(chatHistory.slice(-50))
    }
  })
}

export async function leaveTable(tableId: string) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) return

  const table = await prisma.blackjackTable.findUnique({ where: { id: tableId } })
  if (!table) return

  const playerStates: Record<string, PlayerState> = JSON.parse(table.playerStates || '{}')
  if (playerStates[userId]) {
    const chatHistory = JSON.parse(table.chatHistory || '[]')
    chatHistory.push(`[${new Date().toLocaleTimeString()}] ${playerStates[userId].username} left the table.`)
    delete playerStates[userId]
    
    await prisma.blackjackTable.update({
      where: { id: tableId },
      data: {
        playerStates: JSON.stringify(playerStates),
        chatHistory: JSON.stringify(chatHistory.slice(-50))
      }
    })
  }
}

export async function placeBet(tableId: string, mainBet: number, sideBets: { twentyOnePlusThree: number, perfectPairs: number, luckyLadies: number, bustIt: number }) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const table = await prisma.blackjackTable.findUnique({ where: { id: tableId } })
  if (!table || table.status !== 'BETTING') throw new Error("Not accepting bets")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error("User not found")

  const totalBet = mainBet + Object.values(sideBets).reduce((a,b) => a+b, 0)
  if (user.credits < totalBet) throw new Error("Insufficient funds")

  const playerStates: Record<string, PlayerState> = JSON.parse(table.playerStates || '{}')
  const pState = playerStates[userId]
  if (!pState || pState.status !== 'SITTING') throw new Error("Cannot bet right now")

  await prisma.user.update({
    where: { id: userId },
    data: { credits: { decrement: totalBet } }
  })
  await recordWallet(userId, -totalBet, 'BET', 'Blackjack')

  pState.status = 'READY'
  pState.sideBets = sideBets
  pState.hands = [{
    id: `hand-${Date.now()}`,
    cards: [],
    bet: mainBet,
    status: 'PLAYING',
    payout: 0,
    doubleDown: false
  }]
  
  let timerEndsAt = table.timerEndsAt
  if (!timerEndsAt) {
    timerEndsAt = new Date(Date.now() + 10000) // 10s auto deal
  }

  const chatHistory = JSON.parse(table.chatHistory || '[]')
  chatHistory.push(`[${new Date().toLocaleTimeString()}] ${user.username} placed bets.`)

  await prisma.blackjackTable.update({
    where: { id: tableId },
    data: {
      playerStates: JSON.stringify(playerStates),
      timerEndsAt,
      chatHistory: JSON.stringify(chatHistory.slice(-50))
    }
  })
}

export async function checkAutoDeal(tableId: string) {
  const table = await prisma.blackjackTable.findUnique({ where: { id: tableId } })
  if (!table || table.status !== 'BETTING') return

  const playerStates: Record<string, PlayerState> = JSON.parse(table.playerStates || '{}')
  const players = Object.values(playerStates)
  
  const readyCount = players.filter(p => p.status === 'READY').length
  if (readyCount === 0) return 

  const sittingCount = players.filter(p => p.status === 'SITTING').length
  const timerExpired = table.timerEndsAt && new Date() >= table.timerEndsAt
  
  if (sittingCount === 0 || timerExpired) {
    let shoeData: Card[] = JSON.parse(table.shoe || '[]')
    if (shoeData.length < 60) shoeData = generateShoe(6)

    const dRes = drawCards(shoeData, 2)
    const dealerHand: Card[] = [dRes.drawn[0], { ...dRes.drawn[1], hidden: true }]
    shoeData = dRes.newShoe

    const chatHistory = JSON.parse(table.chatHistory || '[]')

    // Initial Deal to ready players
    for (const uid in playerStates) {
      const p = playerStates[uid]
      if (p.status === 'SITTING') {
        p.status = 'SKIPPED'
      } else if (p.status === 'READY') {
        const pRes = drawCards(shoeData, 2)
        p.hands[0].cards = pRes.drawn
        shoeData = pRes.newShoe
        
        // Evaluate side bets immediately (except BustIt)
        const dUp = dealerHand[0]
        let sideBetPayout = 0
        if (p.sideBets.twentyOnePlusThree > 0) {
          const mult = evaluate21Plus3(p.hands[0].cards, dUp)
          if (mult > 0) sideBetPayout += p.sideBets.twentyOnePlusThree * mult + p.sideBets.twentyOnePlusThree
        }
        if (p.sideBets.perfectPairs > 0) {
          const mult = evaluatePerfectPairs(p.hands[0].cards)
          if (mult > 0) sideBetPayout += p.sideBets.perfectPairs * mult + p.sideBets.perfectPairs
        }
        
        const dHasBlackjack = calculateScore([dealerHand[0], { ...dealerHand[1], hidden: false }]) === 21
        if (p.sideBets.luckyLadies > 0) {
          const mult = evaluateLuckyLadies(p.hands[0].cards, dHasBlackjack)
          if (mult > 0) sideBetPayout += p.sideBets.luckyLadies * mult + p.sideBets.luckyLadies
        }

        if (sideBetPayout > 0) {
          // Add sidebet payout instantly to DB
          await prisma.user.update({
            where: { id: uid },
            data: { credits: { increment: sideBetPayout } }
          })
          chatHistory.push(`[${new Date().toLocaleTimeString()}] ${p.username} won $${sideBetPayout} on side bets!`)
        }

        // Check player blackjack
        if (calculateScore(p.hands[0].cards) === 21) {
          p.hands[0].status = 'BLACKJACK'
        }
        p.status = 'PLAYING'
      }
    }

    chatHistory.push(`[${new Date().toLocaleTimeString()}] Dealing cards...`)

    await prisma.blackjackTable.update({
      where: { id: tableId },
      data: {
        status: dealerHand[0].rank === 'A' ? 'INSURANCE' : 'PLAYING',
        timerEndsAt: dealerHand[0].rank === 'A' ? new Date(Date.now() + 10000) : null,
        dealerHand: JSON.stringify(dealerHand),
        shoe: JSON.stringify(shoeData),
        playerStates: JSON.stringify(playerStates),
        chatHistory: JSON.stringify(chatHistory.slice(-50))
      }
    })
    
    if (dealerHand[0].rank !== 'A') {
      await checkAutoResolve(tableId) 
    }
  }
}

export async function buyInsurance(tableId: string) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const table = await prisma.blackjackTable.findUnique({ where: { id: tableId } })
  if (!table || table.status !== 'INSURANCE') throw new Error("Not insurance phase")

  const playerStates: Record<string, PlayerState> = JSON.parse(table.playerStates || '{}')
  const pState = playerStates[userId]
  if (!pState || pState.status !== 'PLAYING') throw new Error("Cannot buy insurance")

  const insuranceCost = Math.floor(pState.hands[0].bet / 2)
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.credits < insuranceCost) throw new Error("Insufficient funds")

  await prisma.user.update({ where: { id: userId }, data: { credits: { decrement: insuranceCost } } })
  await recordWallet(userId, -insuranceCost, 'BET', 'Blackjack')
  
  pState.insuranceBet = insuranceCost

  await prisma.blackjackTable.update({
    where: { id: tableId },
    data: { playerStates: JSON.stringify(playerStates) }
  })
}

export async function resolveInsurance(tableId: string) {
  const table = await prisma.blackjackTable.findUnique({ where: { id: tableId } })
  if (!table || table.status !== 'INSURANCE') return

  const dHand: Card[] = JSON.parse(table.dealerHand || '[]')
  const dHasBJ = calculateScore([dHand[0], { ...dHand[1], hidden: false }]) === 21
  
  const playerStates: Record<string, PlayerState> = JSON.parse(table.playerStates || '{}')
  const chatHistory = JSON.parse(table.chatHistory || '[]')

  if (dHasBJ) {
    chatHistory.push(`[${new Date().toLocaleTimeString()}] Dealer has Blackjack!`)
    for (const uid in playerStates) {
      const p = playerStates[uid]
      if (p.insuranceBet > 0) {
        const payout = p.insuranceBet * 3 // 2:1 payout + original bet
        await prisma.user.update({ where: { id: uid }, data: { credits: { increment: payout } } })
        await recordWallet(uid, payout, 'WIN', 'Blackjack')
        chatHistory.push(`[${new Date().toLocaleTimeString()}] ${p.username} wins insurance.`)
      }
      p.status = 'RESOLVED'
      for (const h of p.hands) h.status = 'RESOLVED'
    }
  } else {
    chatHistory.push(`[${new Date().toLocaleTimeString()}] Dealer does not have Blackjack.`)
  }

  await prisma.blackjackTable.update({
    where: { id: tableId },
    data: {
      status: dHasBJ ? 'RESOLVED' : 'PLAYING',
      timerEndsAt: null,
      playerStates: JSON.stringify(playerStates),
      chatHistory: JSON.stringify(chatHistory.slice(-50))
    }
  })

  if (!dHasBJ) await checkAutoResolve(tableId)
}

export async function hit(tableId: string, handId: string) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const table = await prisma.blackjackTable.findUnique({ where: { id: tableId } })
  if (!table || table.status !== 'PLAYING') throw new Error("Not playing")

  const playerStates: Record<string, PlayerState> = JSON.parse(table.playerStates || '{}')
  const pState = playerStates[userId]
  if (!pState || pState.status !== 'PLAYING') throw new Error("Cannot hit")

  const hand = pState.hands.find(h => h.id === handId)
  if (!hand || hand.status !== 'PLAYING') throw new Error("Invalid hand")

  let shoeData: Card[] = JSON.parse(table.shoe || '[]')
  const dRes = drawCards(shoeData, 1)
  hand.cards.push(dRes.drawn[0])
  shoeData = dRes.newShoe

  if (calculateScore(hand.cards) > 21) {
    hand.status = 'BUST'
  } else if (calculateScore(hand.cards) === 21) {
    hand.status = 'STAND'
  }

  await prisma.blackjackTable.update({
    where: { id: tableId },
    data: { playerStates: JSON.stringify(playerStates), shoe: JSON.stringify(shoeData) }
  })
  
  await checkAutoResolve(tableId)
}

export async function stand(tableId: string, handId: string) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const table = await prisma.blackjackTable.findUnique({ where: { id: tableId } })
  if (!table || table.status !== 'PLAYING') throw new Error("Not playing")

  const playerStates: Record<string, PlayerState> = JSON.parse(table.playerStates || '{}')
  const pState = playerStates[userId]
  if (!pState || pState.status !== 'PLAYING') throw new Error("Cannot stand")

  const hand = pState.hands.find(h => h.id === handId)
  if (!hand || hand.status !== 'PLAYING') throw new Error("Invalid hand")

  hand.status = 'STAND'

  await prisma.blackjackTable.update({
    where: { id: tableId },
    data: { playerStates: JSON.stringify(playerStates) }
  })
  
  await checkAutoResolve(tableId)
}

export async function doubleDown(tableId: string, handId: string) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const table = await prisma.blackjackTable.findUnique({ where: { id: tableId } })
  if (!table || table.status !== 'PLAYING') throw new Error("Not playing")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error("User not found")

  const playerStates: Record<string, PlayerState> = JSON.parse(table.playerStates || '{}')
  const pState = playerStates[userId]
  if (!pState || pState.status !== 'PLAYING') throw new Error("Cannot double")

  const hand = pState.hands.find(h => h.id === handId)
  if (!hand || hand.status !== 'PLAYING' || hand.cards.length !== 2) throw new Error("Cannot double this hand")

  if (user.credits < hand.bet) throw new Error("Insufficient funds for double")

  await prisma.user.update({ where: { id: userId }, data: { credits: { decrement: hand.bet } } })
  await recordWallet(userId, -hand.bet, 'BET', 'Blackjack')
  hand.bet *= 2
  hand.doubleDown = true

  let shoeData: Card[] = JSON.parse(table.shoe || '[]')
  const dRes = drawCards(shoeData, 1)
  hand.cards.push(dRes.drawn[0])
  shoeData = dRes.newShoe

  if (calculateScore(hand.cards) > 21) {
    hand.status = 'BUST'
  } else {
    hand.status = 'STAND'
  }

  await prisma.blackjackTable.update({
    where: { id: tableId },
    data: { playerStates: JSON.stringify(playerStates), shoe: JSON.stringify(shoeData) }
  })
  
  await checkAutoResolve(tableId)
}

export async function split(tableId: string, handId: string) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const table = await prisma.blackjackTable.findUnique({ where: { id: tableId } })
  if (!table || table.status !== 'PLAYING') throw new Error("Not playing")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error("User not found")

  const playerStates: Record<string, PlayerState> = JSON.parse(table.playerStates || '{}')
  const pState = playerStates[userId]
  if (!pState || pState.status !== 'PLAYING') throw new Error("Cannot split")

  if (pState.hands.length >= 4) throw new Error("Max 3 splits allowed")

  const handIdx = pState.hands.findIndex(h => h.id === handId)
  if (handIdx === -1) throw new Error("Hand not found")
  const hand = pState.hands[handIdx]
  
  if (hand.cards.length !== 2 || hand.cards[0].rank !== hand.cards[1].rank) throw new Error("Can only split pairs")
  if (user.credits < hand.bet) throw new Error("Insufficient funds for split")

  await prisma.user.update({ where: { id: userId }, data: { credits: { decrement: hand.bet } } })
  await recordWallet(userId, -hand.bet, 'BET', 'Blackjack')

  const isAces = hand.cards[0].rank === 'A'
  const c1 = hand.cards[0]
  const c2 = hand.cards[1]

  let shoeData: Card[] = JSON.parse(table.shoe || '[]')
  const draw1 = drawCards(shoeData, 1)
  const draw2 = drawCards(draw1.newShoe, 1)
  shoeData = draw2.newShoe

  hand.cards = [c1, draw1.drawn[0]]
  
  const newHand: Hand = {
    id: `hand-${Date.now()}`,
    cards: [c2, draw2.drawn[0]],
    bet: hand.bet,
    status: 'PLAYING',
    payout: 0,
    doubleDown: false
  }

  if (isAces) {
    // Split aces get exactly 1 card
    hand.status = 'STAND'
    newHand.status = 'STAND'
  }

  pState.hands.splice(handIdx + 1, 0, newHand)

  await prisma.blackjackTable.update({
    where: { id: tableId },
    data: { playerStates: JSON.stringify(playerStates), shoe: JSON.stringify(shoeData) }
  })
  
  await checkAutoResolve(tableId)
}

export async function surrender(tableId: string, handId: string) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const table = await prisma.blackjackTable.findUnique({ where: { id: tableId } })
  if (!table || table.status !== 'PLAYING') throw new Error("Not playing")

  const playerStates: Record<string, PlayerState> = JSON.parse(table.playerStates || '{}')
  const pState = playerStates[userId]
  if (!pState || pState.status !== 'PLAYING') throw new Error("Cannot surrender")

  const hand = pState.hands.find(h => h.id === handId)
  if (!hand || hand.status !== 'PLAYING' || hand.cards.length !== 2 || pState.hands.length > 1) {
    throw new Error("Cannot surrender now")
  }

  hand.status = 'SURRENDER'
  
  const returnAmt = Math.floor(hand.bet / 2)
  await prisma.user.update({ where: { id: userId }, data: { credits: { increment: returnAmt } } })
  await recordWallet(userId, returnAmt, 'REFUND', 'Blackjack')

  await prisma.blackjackTable.update({
    where: { id: tableId },
    data: { playerStates: JSON.stringify(playerStates) }
  })
  
  await checkAutoResolve(tableId)
}

export async function checkAutoResolve(tableId: string) {
  const table = await prisma.blackjackTable.findUnique({ where: { id: tableId } })
  if (!table || table.status !== 'PLAYING') return

  const playerStates: Record<string, PlayerState> = JSON.parse(table.playerStates || '{}')
  
  let allDone = true
  for (const p of Object.values(playerStates)) {
    if (p.status === 'PLAYING') {
      if (p.hands.some(h => h.status === 'PLAYING')) {
        allDone = false
        break
      }
    }
  }

  if (allDone) {
    await resolveRound(tableId)
  }
}

async function resolveRound(tableId: string) {
  const table = await prisma.blackjackTable.findUnique({ where: { id: tableId } })
  if (!table) return

  const dHand: Card[] = JSON.parse(table.dealerHand || '[]')
  dHand[1].hidden = false
  
  let dScore = calculateScore(dHand)
  let shoeData: Card[] = JSON.parse(table.shoe || '[]')

  // Play Dealer hand if needed
  const playerStates: Record<string, PlayerState> = JSON.parse(table.playerStates || '{}')
  let someoneNeedsDealerToPlay = false
  for (const p of Object.values(playerStates)) {
    if (p.status !== 'SKIPPED' && p.hands.some(h => h.status !== 'BUST' && h.status !== 'SURRENDER' && h.status !== 'BLACKJACK')) {
      someoneNeedsDealerToPlay = true
    }
  }

  const chatHistory = JSON.parse(table.chatHistory || '[]')

  if (someoneNeedsDealerToPlay && dScore !== 21) {
    while (dScore < 17 || (dScore === 17 && dHand.some(c => c.rank === 'A'))) {
      const res = drawCards(shoeData, 1)
      dHand.push(res.drawn[0])
      shoeData = res.newShoe
      dScore = calculateScore(dHand)
    }
    chatHistory.push(`[${new Date().toLocaleTimeString()}] Dealer draws to ${dScore}.`)
  }

  for (const uid in playerStates) {
    const p = playerStates[uid]
    if (p.status === 'SKIPPED') continue

    let totalPayout = 0

    // Evaluate BustIt side bet
    if (p.sideBets.bustIt > 0) {
      const bustItMult = evaluateBustIt(dHand)
      if (bustItMult > 0) {
        const bustPayout = p.sideBets.bustIt * bustItMult + p.sideBets.bustIt
        totalPayout += bustPayout
        chatHistory.push(`[${new Date().toLocaleTimeString()}] ${p.username} won $${bustPayout} on Bust It!`)
      }
    }

    for (const h of p.hands) {
      if (h.status === 'SURRENDER') continue // Already got half back
      if (h.status === 'BUST') {
        h.payout = 0
        continue
      }
      
      if (h.status === 'BLACKJACK') {
        if (dScore === 21 && dHand.length === 2) {
          h.payout = h.bet // Push
        } else {
          h.payout = h.bet + (h.bet * 1.5) // 3:2
        }
      } else {
        const pScore = calculateScore(h.cards)
        if (dScore > 21 || pScore > dScore) {
          h.payout = h.bet * 2
        } else if (pScore === dScore) {
          h.payout = h.bet
        } else {
          h.payout = 0
        }
      }
      totalPayout += h.payout
    }

    if (totalPayout > 0) {
      await prisma.user.update({ where: { id: uid }, data: { credits: { increment: totalPayout } } })
      await recordWallet(uid, totalPayout, 'WIN', 'Blackjack')
      chatHistory.push(`[System] ${p.username} won $${totalPayout}!`)
    }
    p.status = 'RESOLVED'
  }

  await prisma.blackjackTable.update({
    where: { id: tableId },
    data: {
      status: 'RESOLVED',
      dealerHand: JSON.stringify(dHand),
      shoe: JSON.stringify(shoeData),
      playerStates: JSON.stringify(playerStates),
      chatHistory: JSON.stringify(chatHistory.slice(-50))
    }
  })
}

export async function nextRound(tableId: string) {
  const table = await prisma.blackjackTable.findUnique({ where: { id: tableId } })
  if (!table || table.status !== 'RESOLVED') return

  const playerStates: Record<string, PlayerState> = JSON.parse(table.playerStates || '{}')
  for (const p of Object.values(playerStates)) {
    p.status = 'SITTING'
    p.hands = []
    p.insuranceBet = 0
    p.sideBets = { twentyOnePlusThree: 0, perfectPairs: 0, luckyLadies: 0, bustIt: 0 }
  }

  await prisma.blackjackTable.update({
    where: { id: tableId },
    data: {
      status: 'BETTING',
      dealerHand: '[]',
      playerStates: JSON.stringify(playerStates),
      timerEndsAt: null
    }
  })
}

