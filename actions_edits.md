--- REPLACE ---
"const JACKPOT_NAMES = ['MINI', 'MINOR', 'MAXI', 'SUPER', 'MAJOR', 'GRAND']\nconst SEED_VALUES = { MINI: 100, MINOR: 250, MAXI: 500, SUPER: 1500, MAJOR: 3000, GRAND: 20000 }\n\nexport async function getGlobalState() {\n  const cookieStore = await cookies()\n  const userId = cookieStore.get('userId')?.value\n  \n  if (userId) {\n    try {\n      await prisma.user.update({\n        where: { id: userId },\n        data: { lastSeenAt: new Date() }\n      })\n    } catch (e) {\n      // Ignore if user not found\n    }\n  }\n\n  // Get active players (seen within last 30 seconds)\n  const thirtySecondsAgo = new Date(Date.now() - 30000)\n  const activePlayersList = await prisma.user.findMany({\n    where: { lastSeenAt: { gt: thirtySecondsAgo } },\n    select: { username: true }\n  })\n  \n  let jackpots = await prisma.globalJackpot.findUnique({ where: { id: 'frankenstein' } })\n  if (!jackpots) {\n    jackpots = await prisma.globalJackpot.create({ data: { id: 'frankenstein' } })\n  }\n  \n  return { jackpots, activePlayers: activePlayersList.map(p => p.username) }\n}\n\nexport async function getFrankensteinState() {"
--- MULTI REPLACE ---
--- REPLACE ---
"  let jackpots = await prisma.globalJackpot.findUnique({ where: { id: 'frankenstein' } })\n  if (!jackpots) {\n    jackpots = await prisma.globalJackpot.create({ data: { \n      id: 'frankenstein',\n      mini: SEED_VALUES.MINI,\n      minor: SEED_VALUES.MINOR,\n      maxi: SEED_VALUES.MAXI,\n      super: SEED_VALUES.SUPER,\n      major: SEED_VALUES.MAJOR,\n      grand: SEED_VALUES.GRAND\n    } })\n  }"
--- MULTI REPLACE ---
export async function getFrankensteinState() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) return null
  let state = await prisma.frankensteinState.findUnique({ where: { userId } })
  if (!state) state = await prisma.frankensteinState.create({ data: { userId } })
  return state
}

export async function resetFrankensteinState() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) return null
  try {
    await prisma.frankensteinState.delete({ where: { userId } })
  } catch(e) {}
  return await getFrankensteinState()
}
--- MULTI REPLACE ---
--- REPLACE ---
"  const config = await getGlobalConfig()\n  let winRateMultiplier = 1.0\n  try {\n    const odds = JSON.parse(config.gameOdds)\n    if (odds['frankenstein'] !== undefined) winRateMultiplier = odds['frankenstein']\n  } catch(e) {}\n\n  let isFreeSpinMode = state.isFreeSpinMode"
--- MULTI REPLACE ---
  let winRateMultiplier = 1.0
  let freeSpinsMultiplier = 1.0
  try {
    const odds = JSON.parse(config.gameOdds)
    const fOdds = odds['frankenstein']
    if (typeof fOdds === 'number') {
      winRateMultiplier = fOdds
    } else if (fOdds) {
      if (fOdds.winRate !== undefined) winRateMultiplier = fOdds.winRate
      if (fOdds.freeSpinsRate !== undefined) freeSpinsMultiplier = fOdds.freeSpinsRate
    }
  } catch(e) {}
  // Add Special Symbols
  if (!isFreeSpinMode) {
    // Scatters anywhere
    for (let c = 0; c < 5; c++) {
      if (Math.random() < 0.1 * winRateMultiplier * freeSpinsMultiplier) grid[Math.floor(Math.random() * 3)][c] = '🔥'
    }
  } else {
    // FREE SPINS MODE
    // Scatters
    for (let c = 0; c < 5; c++) {
      if (Math.random() < 0.08 * winRateMultiplier * freeSpinsMultiplier) grid[Math.floor(Math.random() * 3)][c] = '🔥'
    }
--- MULTI REPLACE ---
      if (fOdds.winRate !== undefined) winRateMultiplier = fOdds.winRate
      if (fOdds.freeSpinsRate !== undefined) freeSpinsMultiplier = fOdds.freeSpinsRate
    }
  } catch(e) {}
  
  console.log(`[Frankenstein] winRate: ${winRateMultiplier}, freeSpinsRate: ${freeSpinsMultiplier}`)
--- REPLACE ---
"  // Add Special Symbols\n  if (!isFreeSpinMode) {\n    // Scatters anywhere\n    for (let c = 0; c < 5; c++) {\n      if (Math.random() < 0.1 * freeSpinsMultiplier) grid[Math.floor(Math.random() * 3)][c] = '🔥'\n    }"
--- REPLACE ---
"  } else {\n    // FREE SPINS MODE\n    // Scatters\n    for (let c = 0; c < 5; c++) {\n      if (Math.random() < 0.08 * freeSpinsMultiplier) grid[Math.floor(Math.random() * 3)][c] = '🔥'\n    }"
--- REPLACE ---
"'use server'\n\nimport { cookies } from 'next/headers'\nimport { prisma } from '@/lib/prisma'\nimport { getGlobalConfig } from '@/lib/admin'\n\nconst SYMBOLS = ['A', 'K', 'Q', 'J', '10', '9', '🧟‍♂️', '🧠', '🦇', '🧪']\n\n// 20 Paylines (standard)\nconst PAYLINES = [\n  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],\n  [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0],\n  [2, 1, 1, 1, 2], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 0, 1, 0, 1], [1, 2, 1, 2, 1],\n  [0, 0, 1, 0, 0], [2, 2, 1, 2, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 2, 0, 2, 0],\n]\n\nconst MULTIPLIERS: Record<string, number> = {\n  '🧟‍♂️': 20, '🧠': 15, '🦇': 10, '🧪': 8, 'A': 5, 'K': 4, 'Q': 3, 'J': 2, '10': 1, '9': 1\n}\n\nconst JACKPOT_NAMES = ['MINI', 'MINOR', 'MAXI', 'SUPER', 'MAJOR', 'GRAND']\nconst SEED_VALUES = { MINI: 100, MINOR: 250, MAXI: 500, SUPER: 1500, MAJOR: 3000, GRAND: 20000 }\n\nexport async function getGlobalState() {\n  const cookieStore = await cookies()\n  const userId = cookieStore.get('userId')?.value\n  \n  if (userId) {\n    try {\n      await prisma.user.update({\n        where: { id: userId },\n        data: { lastSeenAt: new Date() }\n      })\n    } catch (e) {}\n  }\n\n  const thirtySecondsAgo = new Date(Date.now() - 30000)\n  const activePlayersList = await prisma.user.findMany({\n    where: { lastSeenAt: { gt: thirtySecondsAgo } },\n    select: { username: true }\n  })\n  \n  let jackpots = await prisma.globalJackpot.findUnique({ where: { id: 'frankenstein' } })\n  if (!jackpots) {\n    jackpots = await prisma.globalJackpot.create({ data: { \n      id: 'frankenstein',\n      mini: SEED_VALUES.MINI, minor: SEED_VALUES.MINOR, maxi: SEED_VALUES.MAXI,\n      super: SEED_VALUES.SUPER, major: SEED_VALUES.MAJOR, grand: SEED_VALUES.GRAND\n    } })\n  }\n  return { jackpots, activePlayers: activePlayersList.map(p => p.username) }\n}\n\nexport async function getFrankensteinState() {\n  const cookieStore = await cookies()\n  c
<truncated 10730 bytes>
--- REPLACE ---
"  let persistentMultipliers = JSON.parse(state.persistentMultipliers || \"[]\")\n  if (persistentMultipliers.length !== 15) {\n    persistentMultipliers = Array(15).fill(1)\n  }\n\n  let lightningSpreads: {r: number, c: number}[] = []\n  let fireSpreads: {r: number, c: number}[] = []\n  let collectedPrizes: { c: number, amount: number, isJackpot: boolean, jackpotName?: string, prizeName?: string, mult: number }[] = []\n  let powerUpTriggered = false\n  let aliveTriggered = false\n\n  const STATIC_PRIZES = [1000, 500, 300, 200, 150, 120, 100, 80, 60]\n  const JACKPOT_NAMES = ['GRAND', 'SUPER', 'MAJOR', 'MAXI', 'MINOR', 'MINI']\n\n  // Sprinkling mechanics\n  if (!isFreeSpinMode) {\n    for (let c = 0; c < 5; c++) {\n      if (Math.random() < 0.1 * freeSpinsMultiplier) grid[Math.floor(Math.random() * 3)][c] = '🔥' // Scatters\n    }\n  } else {\n    for (let c = 0; c < 5; c++) {\n      if (Math.random() < 0.08 * freeSpinsMultiplier) grid[Math.floor(Math.random() * 3)][c] = '🔥'\n    }\n    const fireCol = Math.floor(Math.random() * 3) + 1\n    const fireRow = Math.floor(Math.random() * 3)\n    if (grid[fireRow][fireCol] !== '🔥') {\n      grid[fireRow][fireCol] = '☄️'\n      fireSpreads.push(...spreadWilds(grid, fireRow, fireCol, '☄️'))\n    }\n  }\n\n  // --- NEW MECHANICS ---\n  \n  // Reel 1: Power Up or It's Alive\n  const reel1BonusChance = isFreeSpinMode ? 0.35 : (0.1 * winRateMultiplier)\n  if (Math.random() < reel1BonusChance || cheat === 'alive' || cheat === 'power') {\n    const r = Math.floor(Math.random() * 3)\n    if (Math.random() < 0.3 || cheat === 'power') {\n      grid[r][0] = 'POWER'\n      powerUpTriggered = true\n    } else {\n      grid[r][0] = 'ALIVE'\n      aliveTriggered = true\n    }\n  }\n\n  // Reels 2-5: Blue / Orange Heads\n  for (let c = 1; c < 5; c++) {\n    if (Math.random() < 0.15) {\n      const r = Math.floor(Math.random() * 3)\n      if (Math.random() < 0.2) grid[r][c] = 'ORANGE' // 20% chance for Orange vs Blue\n      else grid[r][c] = 'BLUE'\n    }\n  }\n\n  // E
<truncated 2086 bytes>
--- REPLACE ---
"  const updatedState = await prisma.frankensteinState.update({\n    where: { userId },\n    data: {\n      isFreeSpinMode,\n      freeSpinsRemaining,\n      persistentMultipliers: JSON.stringify(persistentMultipliers)\n    }\n  })"
--- REPLACE ---
"export async function spinFrankenstein(betAmount: number, cheat?: string, clientOddsMultiplier: number = 1.0) {\n  const session = await getServerSession(authOptions)\n  if (!session?.user?.id) throw new Error('Not authenticated')\n  \n  const userId = session.user.id\n  const user = await prisma.user.findUnique({ where: { id: userId } })\n  if (!user) throw new Error('User not found')\n\n  const state = await getFrankensteinState()\n  \n  const config = await getGlobalConfig()\n  let winRateMultiplier = 1.0 * clientOddsMultiplier\n  let freeSpinsMultiplier = 1.0 * clientOddsMultiplier\n  try {\n    const odds = JSON.parse(config.gameOdds)\n    const fOdds = odds['frankenstein']\n    if (typeof fOdds === 'number') {\n      winRateMultiplier = fOdds * clientOddsMultiplier\n    }\n    else if (fOdds) {\n      if (fOdds.winRate !== undefined) winRateMultiplier = fOdds.winRate * clientOddsMultiplier\n      if (fOdds.freeSpinsRate !== undefined) freeSpinsMultiplier = fOdds.freeSpinsRate * clientOddsMultiplier\n    }\n  } catch(e) {}\n  \n  let isFreeSpinMode = state.isFreeSpinMode"
--- REPLACE ---
"export async function spinFrankenstein(betAmount: number, cheat?: string, clientOddsMultiplier: number = 1.0) {\n  const cookieStore = await cookies()\n  const userId = cookieStore.get('userId')?.value\n  if (!userId) throw new Error(\"Unauthorized\")\n\n  const user = await prisma.user.findUnique({ where: { id: userId } })\n  if (!user) throw new Error(\"User not found\")\n\n  let state = await prisma.frankensteinState.findUnique({ where: { userId } })\n  if (!state) state = await prisma.frankensteinState.create({ data: { userId } })\n\n  if (!state.isFreeSpinMode && user.chipBalance < betAmount) throw new Error(\"Insufficient chip balance\")\n  if (!state.isFreeSpinMode) {\n    await prisma.user.update({ where: { id: userId }, data: { chipBalance: { decrement: betAmount } } })\n  }\n\n  // Generate Base Grid\n  const grid: string[][] = Array(3).fill(null).map(() => Array(5).fill(null).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]))\n\n  const config = await getGlobalConfig()\n  let winRateMultiplier = 1.0 * clientOddsMultiplier\n  let freeSpinsMultiplier = 1.0 * clientOddsMultiplier\n  try {\n    const odds = JSON.parse(config.gameOdds)\n    const fOdds = odds['frankenstein']\n    if (typeof fOdds === 'number') winRateMultiplier = fOdds * clientOddsMultiplier\n    else if (fOdds) {\n      if (fOdds.winRate !== undefined) winRateMultiplier = fOdds.winRate * clientOddsMultiplier\n      if (fOdds.freeSpinsRate !== undefined) freeSpinsMultiplier = fOdds.freeSpinsRate * clientOddsMultiplier\n    }\n  } catch(e) {}"
--- REPLACE ---
"export async function spinFrankenstein(betAmount: number, cheat?: string) {\n  const cookieStore = await cookies()\n  const userId = cookieStore.get('userId')?.value\n  if (!userId) throw new Error(\"Unauthorized\")\n\n  const user = await prisma.user.findUnique({ where: { id: userId } })\n  if (!user) throw new Error(\"User not found\")\n\n  let state = await prisma.frankensteinState.findUnique({ where: { userId } })\n  if (!state) state = await prisma.frankensteinState.create({ data: { userId } })\n\n  if (!state.isFreeSpinMode && user.chipBalance < betAmount) throw new Error(\"Insufficient chip balance\")\n  if (!state.isFreeSpinMode) {\n    await prisma.user.update({ where: { id: userId }, data: { chipBalance: { decrement: betAmount } } })\n  }\n\n  // Generate Base Grid\n  const grid: string[][] = Array(3).fill(null).map(() => Array(5).fill(null).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]))\n\n  const config = await getGlobalConfig()\n  let winRateMultiplier = 1.0\n  let freeSpinsMultiplier = 1.0\n  try {\n    const odds = JSON.parse(config.gameOdds)\n    const fOdds = odds['frankenstein']\n    if (typeof fOdds === 'number') winRateMultiplier = fOdds\n    else if (fOdds) {\n      if (fOdds.winRate !== undefined) winRateMultiplier = fOdds.winRate\n      if (fOdds.freeSpinsRate !== undefined) freeSpinsMultiplier = fOdds.freeSpinsRate\n    }\n  } catch(e) {}"
