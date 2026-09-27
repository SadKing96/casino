'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { logGameHistory } from '@/lib/admin'

const SYMBOLS = ['A', 'K', 'Q', 'J', '10', '9', '🎩', '💰', '💎', '👑']
const MYSTERY_POOL = [...SYMBOLS, 'W', '🔵', '🟡', '🔴']

// 25 Paylines (row index per column)
const PAYLINES = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 0, 1, 0, 1], [1, 2, 1, 2, 1],
  [0, 0, 1, 0, 0], [2, 2, 1, 2, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2], [0, 2, 2, 2, 0], [2, 0, 0, 0, 2], [0, 0, 2, 0, 0], [2, 2, 0, 2, 2],
]

const MULTIPLIERS: Record<string, number> = {
  '👑': 20, '💎': 15, '💰': 10, '🎩': 8, 'A': 5, 'K': 4, 'Q': 3, 'J': 2, '10': 1, '9': 1
}

const JACKPOT_NAMES = ['MINI', 'MINOR', 'MAXI', 'SUPER', 'MAJOR', 'GRAND']
const JACKPOT_REQ: Record<string, number> = { MINI: 2, MINOR: 2, MAXI: 3, SUPER: 4, MAJOR: 5, GRAND: 6 }
const SEED_VALUES = { MINI: 100, MINOR: 250, MAXI: 500, SUPER: 1500, MAJOR: 3000, GRAND: 20000 }

export async function getGlobalState() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  
  if (userId) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() }
      })
    } catch (e) {
      // Ignore if user not found
    }
  }

  // Active players
  const thirtySecondsAgo = new Date(Date.now() - 30000)
  const activePlayersList = await prisma.user.findMany({
    where: { lastSeenAt: { gt: thirtySecondsAgo } },
    select: { username: true }
  })
  
  let jackpots = await prisma.globalJackpot.findUnique({ where: { id: 'piggies' } })
  if (!jackpots) {
    jackpots = await prisma.globalJackpot.create({ data: { 
      id: 'piggies',
      mini: SEED_VALUES.MINI,
      minor: SEED_VALUES.MINOR,
      maxi: SEED_VALUES.MAXI,
      super: SEED_VALUES.SUPER,
      major: SEED_VALUES.MAJOR,
      grand: SEED_VALUES.GRAND
    } })
  }

  // Piggy state
  let piggyState = null
  if (userId) {
    piggyState = await prisma.piggyState.findUnique({ where: { userId } })
    if (!piggyState) piggyState = await prisma.piggyState.create({ data: { userId } })
  }
  
  return { jackpots, activePlayers: activePlayersList.map(p => p.username), piggyState }
}

export async function spinPiggies(betAmount: number) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error("User not found")

  let state = await prisma.piggyState.findUnique({ where: { userId } })
  if (!state) state = await prisma.piggyState.create({ data: { userId } })

  if (!state.isFreeSpinMode && user.chipBalance < betAmount) {
    throw new Error("Insufficient chip balance")
  }
  if (!state.isFreeSpinMode) {
    await prisma.user.update({ where: { id: userId }, data: { chipBalance: { decrement: betAmount } } })
  }

  const activeFeatures = JSON.parse(state.activeFeatures) as string[]
  const isRedActive = state.isFreeSpinMode && activeFeatures.includes('RED')
  const isYellowActive = state.isFreeSpinMode && activeFeatures.includes('YELLOW')

  // Generate Grid
  const generateSymbol = () => {
    if (isRedActive && Math.random() < 0.2) return 'W'
    const r = Math.random()
    if (r < 0.05) return '?'
    if (!state?.isFreeSpinMode) {
      if (r < 0.07) return '🔵'
      if (r < 0.09) return '🟡'
      if (r < 0.11) return '🔴'
    } else if (isYellowActive) {
      if (r < 0.15) return '🪙' // Jackpot coin
    }
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
  }

  const grid: string[][] = Array(3).fill(null).map(() => Array(5).fill(null).map(generateSymbol))
  
  const mysteryReveals: {r: number, c: number, symbol: string}[] = []
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c] === '?') {
        const revealed = MYSTERY_POOL[Math.floor(Math.random() * MYSTERY_POOL.length)]
        grid[r][c] = revealed
        mysteryReveals.push({ r, c, symbol: revealed })
      }
    }
  }

  let lineWinTotal = 0
  const winningLines: number[] = []

  for (let i = 0; i < PAYLINES.length; i++) {
    const line = PAYLINES[i]
    let matchCount = 1
    let firstSymbol = grid[line[0]][0]

    if (firstSymbol === 'W') {
      for (let c = 1; c < 5; c++) {
        const sym = grid[line[c]][c]
        if (sym !== 'W' && !['🔵', '🟡', '🔴', '🪙'].includes(sym)) {
          firstSymbol = sym
          break
        }
      }
    }

    if (['🔵', '🟡', '🔴', '🪙'].includes(firstSymbol)) continue

    for (let c = 1; c < 5; c++) {
      const sym = grid[line[c]][c]
      if (sym === firstSymbol || sym === 'W') {
        matchCount++
      } else {
        break
      }
    }

    if (matchCount >= 3) {
      const mult = MULTIPLIERS[firstSymbol] || 0
      const lineWin = (betAmount / 25) * mult * (matchCount - 2) * 5
      if (lineWin > 0) {
        lineWinTotal += lineWin
        winningLines.push(i)
      }
    }
  }

  let totalWin = lineWinTotal

  // Increment Global Jackpots
  let jackpots = await prisma.globalJackpot.update({
    where: { id: 'piggies' },
    data: {
      mini: { increment: betAmount * 0.001 },
      minor: { increment: betAmount * 0.001 },
      maxi: { increment: betAmount * 0.002 },
      super: { increment: betAmount * 0.003 },
      major: { increment: betAmount * 0.005 },
      grand: { increment: betAmount * 0.01 },
    }
  })

  let triggers = { BLUE: false, YELLOW: false, RED: false }
  let newBlue = state.blueMeter
  let newYellow = state.yellowMeter
  let newRed = state.redMeter
  
  let jackpotProgress = JSON.parse(state.jackpotProgress) as Record<string, number>
  let jackpotWins: string[] = []
  let jackpotAmount = 0

  if (!state.isFreeSpinMode) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5; c++) {
        const sym = grid[r][c]
        if (sym === '🔵') {
          if (Math.random() < 0.1) triggers.BLUE = true
          else if (newBlue < 100) newBlue++
        }
        if (sym === '🟡') {
          if (Math.random() < 0.1) triggers.YELLOW = true
          else newYellow++
        }
        if (sym === '🔴') {
          if (Math.random() < 0.1) triggers.RED = true
          else newRed++
        }
      }
    }
  } else if (isYellowActive) {
    let coinCount = 0
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5; c++) {
        if (grid[r][c] === '🪙') coinCount++
      }
    }
    
    for (let i = 0; i < coinCount; i++) {
      const pots = Object.keys(JACKPOT_REQ)
      const target = pots[Math.floor(Math.random() * pots.length)]
      jackpotProgress[target] = (jackpotProgress[target] || 0) + 1
      
      if (jackpotProgress[target] >= JACKPOT_REQ[target]) {
        jackpotWins.push(target)
        jackpotProgress[target] = 0
        
        // Award from global jackpot
        const amount = jackpots[target.toLowerCase() as keyof typeof jackpots] as number
        jackpotAmount += amount
        totalWin += amount
        
        // Reset that specific tier to its seed
        jackpots = await prisma.globalJackpot.update({
          where: { id: 'piggies' },
          data: { [target.toLowerCase()]: SEED_VALUES[target as keyof typeof SEED_VALUES] }
        })
      }
    }
  }

  let nextFreeSpinsRemaining = state.freeSpinsRemaining
  let nextIsFreeSpinMode = state.isFreeSpinMode
  let nextActiveFeatures = activeFeatures

  if (!state.isFreeSpinMode && (triggers.BLUE || triggers.YELLOW || triggers.RED)) {
    nextIsFreeSpinMode = true
    nextActiveFeatures = []
    if (triggers.BLUE) nextActiveFeatures.push('BLUE')
    if (triggers.YELLOW) nextActiveFeatures.push('YELLOW')
    if (triggers.RED) nextActiveFeatures.push('RED')

    nextFreeSpinsRemaining = triggers.BLUE ? newBlue : 7
    jackpotProgress = {} // reset jackpots
  } else if (state.isFreeSpinMode) {
    nextFreeSpinsRemaining--
    if (nextFreeSpinsRemaining <= 0) {
      nextIsFreeSpinMode = false
      nextFreeSpinsRemaining = 0
      if (activeFeatures.includes('BLUE')) newBlue = 9
      if (activeFeatures.includes('YELLOW')) newYellow = 0
      if (activeFeatures.includes('RED')) newRed = 0
      nextActiveFeatures = []
      jackpotProgress = {}
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { 
      chipBalance: { increment: Math.floor(totalWin) },
      lastSeenAt: new Date()
    }
  })

  const updatedState = await prisma.piggyState.update({
    where: { userId },
    data: {
      blueMeter: newBlue,
      yellowMeter: newYellow,
      redMeter: newRed,
      isFreeSpinMode: nextIsFreeSpinMode,
      freeSpinsRemaining: nextFreeSpinsRemaining,
      activeFeatures: JSON.stringify(nextActiveFeatures),
      jackpotProgress: JSON.stringify(jackpotProgress)
    }
  })

  await prisma.spin.create({
    data: {
      userId,
      bet: state.isFreeSpinMode ? 0 : betAmount,
      win: totalWin,
      result: JSON.stringify({ grid, winningLines, triggers, jackpotWins })
    }
  })

  await logGameHistory({
    userId,
    gameType: 'PIGGY_SLOTS',
    betAmount: state.isFreeSpinMode ? 0 : betAmount,
    payout: Math.floor(totalWin),
    details: { isFreeSpin: state.isFreeSpinMode, jackpotWins }
  })

  return {
    grid,
    mysteryReveals,
    totalWin,
    lineWinTotal,
    jackpotAmount,
    winningLines,
    triggers,
    jackpotWins,
    newState: updatedState,
    newBalance: updatedUser.chipBalance
  }
}
