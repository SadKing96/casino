'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { recordWallet } from '@/lib/wallet'

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
const IS_DEV = process.env.NODE_ENV !== 'production'

export async function resetFrankensteinGame() {
  if (!IS_DEV) return { success: false, error: 'Not available' }
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) return { success: false, error: 'Unauthorized' }
  
  await prisma.frankensteinState.update({
    where: { userId },
    data: {
      isFreeSpinMode: false,
      freeSpinsRemaining: 0,
      currentMultiplier: 1,
      persistentMultipliers: JSON.stringify(Array(15).fill(1))
    }
  })
  
  return { success: true }
}

export async function getFrankensteinState() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) return null
  let state = await prisma.frankensteinState.findUnique({ where: { userId } })
  if (!state) state = await prisma.frankensteinState.create({ data: { userId } })
  let persistentMultipliers: number[] = []
  try {
    persistentMultipliers = JSON.parse(state.persistentMultipliers || "[]")
  } catch(e) {}
  if (!Array.isArray(persistentMultipliers) || persistentMultipliers.length !== 15) {
    persistentMultipliers = Array(15).fill(1)
  }
  return { state, persistentMultipliers }
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

export async function spinFrankenstein(betAmount: number, forceOptions?: { forceJackpot?: string, forceFreeSpins?: boolean }) {
  // Admin test overrides are dev-only; ignore them entirely in production
  if (!IS_DEV) forceOptions = undefined
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error("User not found")

  let state = await prisma.frankensteinState.findUnique({ where: { userId } })
  if (!state) state = await prisma.frankensteinState.create({ data: { userId } })

  const globalConfig = await prisma.globalConfig.findUnique({ where: { id: 'default' } })
  const gameOdds = globalConfig?.gameOdds ? JSON.parse(globalConfig.gameOdds) : {}
  const winMult = (gameOdds['frankenstein'] ?? gameOdds['slots'])?.winRate ?? 1.0
  const freeSpinsMult = (gameOdds['frankenstein'] ?? gameOdds['slots'])?.freeSpinsRate ?? 1.0

  if (!state.isFreeSpinMode && user.credits < betAmount) {
    throw new Error("Insufficient chip balance")
  }
  if (!state.isFreeSpinMode) {
    await prisma.user.update({ where: { id: userId }, data: { credits: { decrement: betAmount } } })
  }

  // Generate Base Grid
  const grid: string[][] = Array(3).fill(null).map(() => Array(5).fill(null).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]))

  let isFreeSpinMode = state.isFreeSpinMode
  let currentMultiplier = state.currentMultiplier
  let freeSpinsRemaining = state.freeSpinsRemaining
  let persistentMultipliers: number[] = []
  try {
    persistentMultipliers = JSON.parse(state.persistentMultipliers || "[]")
  } catch(e) {}
  if (!Array.isArray(persistentMultipliers) || persistentMultipliers.length !== 15) {
    persistentMultipliers = Array(15).fill(1)
  }
  let powerUpTriggered = false
  let aliveTriggered = false
  let collectedPrizes: any[] = []
  const STATIC_PRIZES = [1000, 500, 300, 200, 150, 120, 100, 80, 60]
  const JACKPOT_NAMES = ['GRAND', 'SUPER', 'MAJOR', 'MAXI', 'MINOR', 'MINI']

  let lightningSpreads: {r: number, c: number}[] = []
  let fireSpreads: {r: number, c: number}[] = []

  // Add Special Symbols
  if (!isFreeSpinMode) {
    let forcedScatters = forceOptions?.forceFreeSpins ? 3 : 0
    for (let c = 0; c < 5; c++) {
      if (forcedScatters > 0) {
        grid[Math.floor(Math.random() * 3)][c] = '🔥'
        forcedScatters--
      } else if (Math.random() < (0.1 * freeSpinsMult)) {
        grid[Math.floor(Math.random() * 3)][c] = '🔥'
      }
    }
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
    for (let c = 0; c < 5; c++) {
      // Extremely rare scatter drops during free spins
      if (Math.random() < 0.02) grid[Math.floor(Math.random() * 3)][c] = '🔥'
    }
    const fireCol = Math.floor(Math.random() * 3) + 1
    const fireRow = Math.floor(Math.random() * 3)
    if (grid[fireRow][fireCol] !== '🔥') {
      grid[fireRow][fireCol] = '☄️'
      fireSpreads.push(...spreadWilds(grid, fireRow, fireCol, '☄️'))
    }
    if (currentMultiplier < 5 && Math.random() < 0.3) {
      grid[Math.floor(Math.random() * 3)][4] = '✖️'
      currentMultiplier++
    }
  }

  // --- NEW MECHANICS ---
  // Reel 1: Power Up or It's Alive
  const reel1BonusChance = isFreeSpinMode ? 0.35 : (0.1 * winMult)
  const isForcedJackpot = forceOptions?.forceJackpot && JACKPOT_NAMES.includes(forceOptions.forceJackpot);

  if (Math.random() < reel1BonusChance || forceOptions?.forceJackpot === 'POWER' || forceOptions?.forceJackpot === 'ALIVE' || isForcedJackpot) {
    const r = Math.floor(Math.random() * 3)
    if (Math.random() < 0.3 || forceOptions?.forceJackpot === 'POWER' || isForcedJackpot) {
      grid[r][0] = 'POWER'
      powerUpTriggered = true
    } else {
      grid[r][0] = 'ALIVE'
      aliveTriggered = true
    }
  }

  // Reels 2-5: Blue / Orange Heads
  for (let c = 1; c < 5; c++) {
    if (Math.random() < 0.15 || isForcedJackpot) {
      const r = Math.floor(Math.random() * 3)
      if (Math.random() < 0.2 || isForcedJackpot) grid[r][c] = 'ORANGE'
      else grid[r][c] = 'BLUE'
    }
  }

  // Evaluate Power Up
  if (powerUpTriggered) {
    const numToPower = Math.floor(Math.random() * 4) + 3 // 3 to 6 boxes
    for (let i = 0; i < numToPower; i++) {
      const idx = Math.floor(Math.random() * 15)
      persistentMultipliers[idx] += Math.floor(Math.random() * 3) + 1
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
    // Need a full 3 scatters to re-trigger, which is very rare now
    if (scatterCount >= 3) freeSpinsRemaining += 10
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

  // Evaluate Pyramids
  let jackpotWinAmount = 0
  let jackpotsToReset: string[] = []
  
  if (aliveTriggered || powerUpTriggered) {
    for (let c = 1; c < 5; c++) {
      for (let r = 0; r < 3; r++) {
        if (grid[r][c] === 'BLUE') {
          const blueIdx = Math.floor(Math.random() * STATIC_PRIZES.length)
          const globalIdx = 6 + blueIdx
          const mult = persistentMultipliers[globalIdx]
          const win = STATIC_PRIZES[blueIdx] * mult
          lineWinTotal += win
          collectedPrizes.push({ c, amount: win, isJackpot: false, mult, prizeName: STATIC_PRIZES[blueIdx].toString() })
          persistentMultipliers[globalIdx] = 1
        } else if (grid[r][c] === 'ORANGE') {
          const rand = Math.random()
          let jIdx = 5 // MINI
          if (rand > 0.98) jIdx = 0 // GRAND
          else if (rand > 0.94) jIdx = 1 // SUPER
          else if (rand > 0.85) jIdx = 2 // MAJOR
          else if (rand > 0.70) jIdx = 3 // MAXI
          else if (rand > 0.45) jIdx = 4 // MINOR

          const isForcedJackpot = forceOptions?.forceJackpot && JACKPOT_NAMES.includes(forceOptions.forceJackpot);
          if (isForcedJackpot) {
            jIdx = JACKPOT_NAMES.indexOf(forceOptions!.forceJackpot!);
          }

          const tier = JACKPOT_NAMES[jIdx]
          const mult = persistentMultipliers[jIdx]
          const baseJackpot = updatedJackpots[tier.toLowerCase() as keyof typeof updatedJackpots] as number
          const win = baseJackpot * mult
          jackpotWinAmount += win
          collectedPrizes.push({ c, amount: win, isJackpot: true, jackpotName: tier, mult })
          persistentMultipliers[jIdx] = 1
          jackpotsToReset.push(tier.toLowerCase())
        }
      }
    }
  }

  for (const tier of jackpotsToReset) {
    await prisma.globalJackpot.update({
      where: { id: 'frankenstein' },
      data: { [tier]: SEED_VALUES[tier.toUpperCase() as keyof typeof SEED_VALUES] }
    })
  }

  const totalWin = lineWinTotal + jackpotWinAmount

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
      credits: { increment: Math.floor(totalWin) },
      lastSeenAt: new Date()
    }
  })
  await recordWallet(userId, Math.floor(totalWin) - (state.isFreeSpinMode ? 0 : betAmount), 'ROUND', 'Frankenstein')

  const updatedState = await prisma.frankensteinState.update({
    where: { userId },
    data: {
      isFreeSpinMode,
      freeSpinsRemaining,
      currentMultiplier,
      persistentMultipliers: JSON.stringify(persistentMultipliers)
    }
  })

  await prisma.spin.create({
    data: {
      userId,
      bet: state.isFreeSpinMode ? 0 : betAmount,
      win: totalWin,
      result: JSON.stringify({ grid, winningLines, jackpotWon: null, scatterCount })
    }
  })

  return {
    grid,
    totalWin,
    lineWinTotal,
    jackpotWon: null,
    jackpotAmount: jackpotWinAmount,
    winningLines,
    lightningSpreads,
    fireSpreads,
    collectedPrizes,
    newState: updatedState,
    newBalance: updatedUser.credits,
    triggerFreeSpins,
    scatterCount
  }
}
