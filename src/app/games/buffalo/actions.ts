'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

const SYMBOLS = ['🦬', '🦅', '🐺', '🦌', 'A', 'K', 'Q', 'J', '10', '9']

// 1024 Ways Paytable (Multipliers of total bet)
const PAYTABLE: Record<string, Record<number, number>> = {
  '🦬': { 5: 3, 4: 2.5, 3: 2, 2: 0.5 },
  '🦅': { 5: 1.5, 4: 1, 3: 0.5 },
  '🐺': { 5: 1.5, 4: 1, 3: 0.5 },
  '🦌': { 5: 1.2, 4: 0.8, 3: 0.4 },
  'A': { 5: 1, 4: 0.5, 3: 0.2 },
  'K': { 5: 1, 4: 0.5, 3: 0.2 },
  'Q': { 5: 0.8, 4: 0.3, 3: 0.1 },
  'J': { 5: 0.8, 4: 0.3, 3: 0.1 },
  '10': { 5: 0.8, 4: 0.3, 3: 0.1 },
  '9': { 5: 0.8, 4: 0.3, 3: 0.1 },
  '🪙': { 5: 20, 4: 10, 3: 2 }, // Scatters
}

export async function getBuffaloState() {
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

  const thirtySecondsAgo = new Date(Date.now() - 30000)
  const activePlayersList = await prisma.user.findMany({
    where: { lastSeenAt: { gt: thirtySecondsAgo } },
    select: { username: true }
  })
  
  let buffaloState = null
  if (userId) {
    buffaloState = await prisma.buffaloState.findUnique({ where: { userId } })
    if (!buffaloState) buffaloState = await prisma.buffaloState.create({ data: { userId } })
  }
  
  return { activePlayers: activePlayersList.map(p => p.username), buffaloState }
}

export async function spinBuffalo(betAmount: number) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error("User not found")

  let state = await prisma.buffaloState.findUnique({ where: { userId } })
  if (!state) state = await prisma.buffaloState.create({ data: { userId } })

  if (!state.isFreeSpinMode && user.chipBalance < betAmount) {
    throw new Error("Insufficient chip balance")
  }
  if (!state.isFreeSpinMode) {
    await prisma.user.update({ where: { id: userId }, data: { chipBalance: { decrement: betAmount } } })
  }

  // Generate 5x4 Grid
  // Buffalo heavily stacked. Scatters on all reels. Wilds only on 2,3,4.
  const generateSymbol = (reelIndex: number) => {
    const r = Math.random()
    if (r < 0.25) return '🦬' // Heavy stacks
    if (r > 0.95) return '🪙' // Scatter
    if (reelIndex > 0 && reelIndex < 4 && r > 0.90) return '🌅' // Wilds on 2,3,4
    
    // Remaining probability split among normal symbols
    const s = Math.random()
    if (s < 0.1) return '🦅'
    if (s < 0.2) return '🐺'
    if (s < 0.3) return '🦌'
    return ['A', 'K', 'Q', 'J', '10', '9'][Math.floor(Math.random() * 6)]
  }

  const grid: string[][] = Array(4).fill(null).map(() => Array(5).fill(null))
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      grid[r][c] = generateSymbol(c)
    }
  }

  // Generate multipliers for wilds if in free spins
  const wildMultipliers: Record<string, number> = {}
  if (state.isFreeSpinMode) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 5; c++) {
        if (grid[r][c] === '🌅') {
          wildMultipliers[`${r},${c}`] = Math.random() < 0.5 ? 2 : 3
        }
      }
    }
  }

  let totalWin = 0
  const winningWays: any[] = []

  // Count Scatters
  let scatterCount = 0
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c] === '🪙') scatterCount++
    }
  }

  // Scatter Payout
  if (scatterCount >= 3) {
    totalWin += betAmount * PAYTABLE['🪙'][scatterCount]
  }

  // 1024 Ways Evaluation
  const countsPerReel: Record<string, { count: number, wilds: number[] }>[] = [{}, {}, {}, {}, {}]
  
  for (let c = 0; c < 5; c++) {
    for (let r = 0; r < 4; r++) {
      const sym = grid[r][c]
      if (sym === '🪙') continue
      
      if (sym === '🌅') {
        // Wild acts as all normal symbols
        SYMBOLS.forEach(s => {
          if (!countsPerReel[c][s]) countsPerReel[c][s] = { count: 0, wilds: [] }
          countsPerReel[c][s].count++
          if (state!.isFreeSpinMode) countsPerReel[c][s].wilds.push(wildMultipliers[`${r},${c}`])
        })
      } else {
        if (!countsPerReel[c][sym]) countsPerReel[c][sym] = { count: 0, wilds: [] }
        countsPerReel[c][sym].count++
      }
    }
  }

  // Calculate wins for each symbol
  SYMBOLS.forEach(sym => {
    let matchLength = 0
    for (let c = 0; c < 5; c++) {
      if (countsPerReel[c][sym] && countsPerReel[c][sym].count > 0) {
        matchLength = c + 1
      } else {
        break
      }
    }

    if (PAYTABLE[sym][matchLength]) {
      // Calculate number of ways
      let ways = 1
      for (let c = 0; c < matchLength; c++) {
        ways *= countsPerReel[c][sym].count
      }

      // Calculate base win
      let baseWin = betAmount * PAYTABLE[sym][matchLength] * ways
      
      // Calculate multiplier impact (averaging wilds across the ways isn't exactly how the real game does it,
      // but a simplified model: if there are wilds, we apply their average multiplier for that symbol's win)
      // Actually, in Buffalo, each unique way has its own multiplier.
      // Let's precisely calculate total payout for all ways of this symbol.
      
      let symbolTotalWin = 0
      const calculateWays = (colIdx: number, currentMult: number) => {
        if (colIdx === matchLength) {
          symbolTotalWin += betAmount * PAYTABLE[sym][matchLength] * currentMult
          return
        }
        
        // Count non-wilds
        const totalOccurrences = countsPerReel[colIdx][sym].count
        const wildsList = countsPerReel[colIdx][sym].wilds
        const nonWildsCount = totalOccurrences - wildsList.length
        
        // Recurse for non-wilds
        for (let i = 0; i < nonWildsCount; i++) {
          calculateWays(colIdx + 1, currentMult)
        }
        
        // Recurse for wilds
        for (let i = 0; i < wildsList.length; i++) {
          calculateWays(colIdx + 1, currentMult * wildsList[i])
        }
      }
      
      calculateWays(0, 1)

      if (symbolTotalWin > 0) {
        totalWin += symbolTotalWin
        winningWays.push({ symbol: sym, length: matchLength, ways, win: symbolTotalWin })
      }
    }
  })

  let nextFreeSpinsRemaining = state.freeSpinsRemaining
  let nextIsFreeSpinMode = state.isFreeSpinMode

  // Free Spin Triggers and Retriggers
  let newlyTriggeredSpins = 0
  if (scatterCount >= 3) {
    if (scatterCount === 3) newlyTriggeredSpins = 8
    if (scatterCount === 4) newlyTriggeredSpins = 15
    if (scatterCount === 5) newlyTriggeredSpins = 20
    
    if (!state.isFreeSpinMode) {
      nextIsFreeSpinMode = true
      nextFreeSpinsRemaining = newlyTriggeredSpins
    } else {
      nextFreeSpinsRemaining += newlyTriggeredSpins
    }
  } else if (state.isFreeSpinMode && scatterCount === 2) {
    newlyTriggeredSpins = 5
    nextFreeSpinsRemaining += newlyTriggeredSpins
  }

  // Handle Free Spins Decrement
  if (state.isFreeSpinMode && newlyTriggeredSpins === 0) {
    nextFreeSpinsRemaining--
    if (nextFreeSpinsRemaining <= 0) {
      nextIsFreeSpinMode = false
      nextFreeSpinsRemaining = 0
    }
  } else if (state.isFreeSpinMode && newlyTriggeredSpins > 0) {
    // If we just retriggered, we still consume one spin for the current spin
    nextFreeSpinsRemaining--
    if (nextFreeSpinsRemaining <= 0) {
        nextIsFreeSpinMode = false
        nextFreeSpinsRemaining = 0
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { 
      chipBalance: { increment: Math.floor(totalWin) },
      lastSeenAt: new Date()
    }
  })

  const updatedState = await prisma.buffaloState.update({
    where: { userId },
    data: {
      isFreeSpinMode: nextIsFreeSpinMode,
      freeSpinsRemaining: nextFreeSpinsRemaining
    }
  })

  await prisma.spin.create({
    data: {
      userId,
      bet: state.isFreeSpinMode ? 0 : betAmount,
      win: totalWin,
      result: JSON.stringify({ grid, winningWays, scatterCount, wildMultipliers, newlyTriggeredSpins })
    }
  })

  return {
    grid,
    totalWin,
    winningWays,
    scatterCount,
    wildMultipliers,
    newlyTriggeredSpins,
    newState: updatedState,
    newBalance: updatedUser.chipBalance
  }
}
