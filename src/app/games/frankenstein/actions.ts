'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

const SYMBOLS = ['A', 'K', 'Q', 'J', '10', '9', '🧟‍♂️', '🧠', '🦇', '🧪']

// 20 Paylines (standard)
const PAYLINES = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 0, 1, 0, 1], [1, 2, 1, 2, 1],
  [0, 0, 1, 0, 0], [2, 2, 1, 2, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 2, 0, 2, 0],
]

const MULTIPLIERS: Record<string, number> = {
  '🧟‍♂️': 20, '🧠': 15, '🦇': 10, '🧪': 8, 'A': 5, 'K': 4, 'Q': 3, 'J': 2, '10': 1, '9': 1
}

const JACKPOT_NAMES = ['MINI', 'MINOR', 'MAXI', 'SUPER', 'MAJOR', 'GRAND']
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

  // Get active players (seen within last 30 seconds)
  const thirtySecondsAgo = new Date(Date.now() - 30000)
  const activePlayersList = await prisma.user.findMany({
    where: { lastSeenAt: { gt: thirtySecondsAgo } },
    select: { username: true }
  })
  
  let jackpots = await prisma.globalJackpot.findUnique({ where: { id: 'frankenstein' } })
  if (!jackpots) {
    jackpots = await prisma.globalJackpot.create({ data: { 
      id: 'frankenstein',
      mini: SEED_VALUES.MINI,
      minor: SEED_VALUES.MINOR,
      maxi: SEED_VALUES.MAXI,
      super: SEED_VALUES.SUPER,
      major: SEED_VALUES.MAJOR,
      grand: SEED_VALUES.GRAND
    } })
  }
  
  return { jackpots, activePlayers: activePlayersList.map(p => p.username) }
}

export async function getFrankensteinState() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) return null
  let state = await prisma.frankensteinState.findUnique({ where: { userId } })
  if (!state) state = await prisma.frankensteinState.create({ data: { userId } })
  return state
}

// Spreads wilds to adjacent squares
function spreadWilds(grid: string[][], r: number, c: number, wildChar: string): {r: number, c: number}[] {
  const spreads: {r: number, c: number}[] = []
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]
  // Shuffle directions
  directions.sort(() => 0.5 - Math.random())
  
  // Spread to 2 to 4 adjacent squares
  const spreadCount = Math.floor(Math.random() * 3) + 2
  let spreaded = 0
  for (const [dr, dc] of directions) {
    if (spreaded >= spreadCount) break
    const nr = r + dr
    const nc = c + dc
    if (nr >= 0 && nr < 3 && nc >= 0 && nc < 5) {
      if (grid[nr][nc] !== '🔥' && grid[nr][nc] !== wildChar) {
        grid[nr][nc] = wildChar
        spreads.push({ r: nr, c: nc })
        spreaded++
      }
    }
  }
  return spreads
}

export async function spinFrankenstein(betAmount: number) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error("User not found")

  let state = await prisma.frankensteinState.findUnique({ where: { userId } })
  if (!state) state = await prisma.frankensteinState.create({ data: { userId } })

  if (!state.isFreeSpinMode && user.chipBalance < betAmount) {
    throw new Error("Insufficient chip balance")
  }
  if (!state.isFreeSpinMode) {
    await prisma.user.update({ where: { id: userId }, data: { chipBalance: { decrement: betAmount } } })
  }

  // Generate Base Grid
  const grid: string[][] = Array(3).fill(null).map(() => Array(5).fill(null).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]))

  let isFreeSpinMode = state.isFreeSpinMode
  let currentMultiplier = state.currentMultiplier
  let freeSpinsRemaining = state.freeSpinsRemaining

  let lightningSpreads: {r: number, c: number}[] = []
  let fireSpreads: {r: number, c: number}[] = []

  // Add Special Symbols
  if (!isFreeSpinMode) {
    // Scatters anywhere
    for (let c = 0; c < 5; c++) {
      if (Math.random() < 0.1) grid[Math.floor(Math.random() * 3)][c] = '🔥'
    }
    // Lightning Wilds on 2, 3, 4
    for (let c = 1; c <= 3; c++) {
      if (Math.random() < 0.15) {
        const r = Math.floor(Math.random() * 3)
        if (grid[r][c] !== '🔥') {
          grid[r][c] = '⚡'
          lightningSpreads.push(...spreadWilds(grid, r, c, '⚡'))
        }
      }
    }
  } else {
    // FREE SPINS MODE
    // Scatters
    for (let c = 0; c < 5; c++) {
      if (Math.random() < 0.08) grid[Math.floor(Math.random() * 3)][c] = '🔥'
    }
    // Fire Wild guaranteed on 2, 3, or 4
    const fireCol = Math.floor(Math.random() * 3) + 1
    const fireRow = Math.floor(Math.random() * 3)
    if (grid[fireRow][fireCol] !== '🔥') {
      grid[fireRow][fireCol] = '☄️'
      fireSpreads.push(...spreadWilds(grid, fireRow, fireCol, '☄️'))
    }
    
    // Multiplier exclusively on reel 5
    if (currentMultiplier < 5 && Math.random() < 0.3) {
      grid[Math.floor(Math.random() * 3)][4] = '✖️'
      currentMultiplier++
    }
  }

  // Scatter Evaluation
  let scatterCount = 0
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c] === '🔥') scatterCount++
    }
  }

  let triggerFreeSpins = false
  if (!isFreeSpinMode && scatterCount >= 3) {
    triggerFreeSpins = true
    isFreeSpinMode = true
    freeSpinsRemaining = 10
    currentMultiplier = 1
  } else if (isFreeSpinMode) {
    if (scatterCount === 2) freeSpinsRemaining += 5
    else if (scatterCount >= 3) freeSpinsRemaining += 10
  }

  // Payline Evaluation
  let lineWinTotal = 0
  const winningLines: number[] = []

  for (let i = 0; i < PAYLINES.length; i++) {
    const line = PAYLINES[i]
    let matchCount = 1
    let firstSymbol = grid[line[0]][0]

    // Determine first symbol skipping wilds
    if (firstSymbol === '⚡' || firstSymbol === '☄️') {
      for (let c = 1; c < 5; c++) {
        const sym = grid[line[c]][c]
        if (sym !== '⚡' && sym !== '☄️' && sym !== '🔥' && sym !== '✖️') {
          firstSymbol = sym
          break
        }
      }
    }

    if (firstSymbol === '🔥' || firstSymbol === '✖️') continue

    for (let c = 1; c < 5; c++) {
      const sym = grid[line[c]][c]
      if (sym === firstSymbol || sym === '⚡' || sym === '☄️') {
        matchCount++
      } else {
        break
      }
    }

    if (matchCount >= 3) {
      const mult = MULTIPLIERS[firstSymbol] || 0
      const lineWin = (betAmount / 20) * mult * (matchCount - 2) * 5
      if (lineWin > 0) {
        lineWinTotal += lineWin
        winningLines.push(i)
      }
    }
  }

  if (isFreeSpinMode && !triggerFreeSpins) {
    lineWinTotal *= currentMultiplier
  }

  // Increment Global Jackpots
  const updatedJackpots = await prisma.globalJackpot.update({
    where: { id: 'frankenstein' },
    data: {
      mini: { increment: betAmount * 0.001 },
      minor: { increment: betAmount * 0.001 },
      maxi: { increment: betAmount * 0.002 },
      super: { increment: betAmount * 0.003 },
      major: { increment: betAmount * 0.005 },
      grand: { increment: betAmount * 0.01 },
    }
  })

  // Random Jackpot Trigger
  let jackpotWon: string | null = null
  let jackpotAmount = 0
  if (Math.random() < 0.01) { // 1% chance for any jackpot
    const r = Math.random()
    if (r < 0.5) jackpotWon = 'MINI'
    else if (r < 0.8) jackpotWon = 'MINOR'
    else if (r < 0.95) jackpotWon = 'MAXI'
    else if (r < 0.98) jackpotWon = 'SUPER'
    else if (r < 0.995) jackpotWon = 'MAJOR'
    else jackpotWon = 'GRAND'
    
    jackpotAmount = updatedJackpots[jackpotWon.toLowerCase() as keyof typeof updatedJackpots] as number
    
    // Reset that specific tier
    await prisma.globalJackpot.update({
      where: { id: 'frankenstein' },
      data: { [jackpotWon.toLowerCase()]: SEED_VALUES[jackpotWon as keyof typeof SEED_VALUES] }
    })
  }

  const totalWin = lineWinTotal + jackpotAmount

  // Update state
  if (isFreeSpinMode && !triggerFreeSpins) {
    freeSpinsRemaining--
    if (freeSpinsRemaining <= 0) {
      isFreeSpinMode = false
      freeSpinsRemaining = 0
      currentMultiplier = 1
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { 
      chipBalance: { increment: Math.floor(totalWin) },
      lastSeenAt: new Date()
    }
  })

  const updatedState = await prisma.frankensteinState.update({
    where: { userId },
    data: {
      isFreeSpinMode,
      freeSpinsRemaining,
      currentMultiplier
    }
  })

  await prisma.spin.create({
    data: {
      userId,
      bet: state.isFreeSpinMode ? 0 : betAmount,
      win: totalWin,
      result: JSON.stringify({ grid, winningLines, jackpotWon, scatterCount })
    }
  })

  return {
    grid,
    totalWin,
    lineWinTotal,
    jackpotWon,
    jackpotAmount,
    winningLines,
    lightningSpreads,
    fireSpreads,
    newState: updatedState,
    newBalance: updatedUser.chipBalance,
    triggerFreeSpins,
    scatterCount
  }
}
