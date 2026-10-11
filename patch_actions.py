import re

with open('src/app/games/frankenstein/actions.ts', 'r') as f:
    code = f.read()

# Add persistentMultipliers reading
code = code.replace(
'''  let isFreeSpinMode = state.isFreeSpinMode
  let currentMultiplier = state.currentMultiplier
  let freeSpinsRemaining = state.freeSpinsRemaining''',
'''  let isFreeSpinMode = state.isFreeSpinMode
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
  const JACKPOT_NAMES = ['GRAND', 'SUPER', 'MAJOR', 'MAXI', 'MINOR', 'MINI']'''
)

# Replace Add Special Symbols block
special_symbols_block = '''  // Add Special Symbols
  if (!isFreeSpinMode) {
    // Scatters anywhere
    let forcedScatters = forceOptions?.forceFreeSpins ? 3 : 0
    for (let c = 0; c < 5; c++) {
      if (forcedScatters > 0) {
        grid[Math.floor(Math.random() * 3)][c] = '🔥'
        forcedScatters--
      } else if (Math.random() < (0.1 * freeSpinsMult)) {
        grid[Math.floor(Math.random() * 3)][c] = '🔥'
      }
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
  }'''

new_special_symbols = '''  // Add Special Symbols
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
      if (Math.random() < 0.08) grid[Math.floor(Math.random() * 3)][c] = '🔥'
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
  if (Math.random() < reel1BonusChance || forceOptions?.forceJackpot === 'POWER' || forceOptions?.forceJackpot === 'ALIVE') {
    const r = Math.floor(Math.random() * 3)
    if (Math.random() < 0.3 || forceOptions?.forceJackpot === 'POWER') {
      grid[r][0] = 'POWER'
      powerUpTriggered = true
    } else {
      grid[r][0] = 'ALIVE'
      aliveTriggered = true
    }
  }

  // Reels 2-5: Blue / Orange Heads
  for (let c = 1; c < 5; c++) {
    if (Math.random() < 0.15) {
      const r = Math.floor(Math.random() * 3)
      if (Math.random() < 0.2) grid[r][c] = 'ORANGE'
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
'''

code = code.replace(special_symbols_block, new_special_symbols)

# Replace Jackpot / Pyramid mechanics
jackpot_block = '''  // Random Jackpot Trigger
  let jackpotWon: string | null = null
  let jackpotAmount = 0
  if (forceOptions?.forceJackpot || Math.random() < (0.01 * winMult)) { // chance for any jackpot
    if (forceOptions?.forceJackpot) {
      jackpotWon = forceOptions.forceJackpot.toUpperCase()
    } else {
      const r = Math.random()
      if (r < 0.5) jackpotWon = 'MINI'
      else if (r < 0.8) jackpotWon = 'MINOR'
      else if (r < 0.95) jackpotWon = 'MAXI'
      else if (r < 0.98) jackpotWon = 'SUPER'
      else if (r < 0.995) jackpotWon = 'MAJOR'
      else jackpotWon = 'GRAND'
    }
    
    jackpotAmount = updatedJackpots[jackpotWon.toLowerCase() as keyof typeof updatedJackpots] as number
    
    // Reset that specific tier
    await prisma.globalJackpot.update({
      where: { id: 'frankenstein' },
      data: { [jackpotWon.toLowerCase()]: SEED_VALUES[jackpotWon as keyof typeof SEED_VALUES] }
    })
  }

  const totalWin = lineWinTotal + jackpotAmount'''

new_jackpot_block = '''  // Evaluate Pyramids
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

  const totalWin = lineWinTotal + jackpotWinAmount'''

code = code.replace(jackpot_block, new_jackpot_block)

code = code.replace(
'''  const updatedState = await prisma.frankensteinState.update({
    where: { userId },
    data: {
      isFreeSpinMode,
      freeSpinsRemaining,
      currentMultiplier
    }
  })''',
'''  const updatedState = await prisma.frankensteinState.update({
    where: { userId },
    data: {
      isFreeSpinMode,
      freeSpinsRemaining,
      currentMultiplier,
      persistentMultipliers: JSON.stringify(persistentMultipliers)
    }
  })'''
)

code = code.replace('return { grid, totalWin, jackpotWon, lineWinTotal', 'return { grid, totalWin, jackpotWon: null, lineWinTotal, collectedPrizes, persistentMultipliers')

with open('src/app/games/frankenstein/actions.ts', 'w') as f:
    f.write(code)

print("Patched actions.ts")
