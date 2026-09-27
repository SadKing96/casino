export interface CrashBet {
  userId: string
  amount: number
  cashedOut: boolean
  cashOutMultiplier: number
  profit: number
}

// 5% chance of instant crash at 1.00. Otherwise, follows a heavy-tailed distribution.
export function generateCrashPoint(): number {
  if (Math.random() < 0.05) return 1.00
  
  const r = Math.random()
  const max = 1000.0 // Cap at 1000x for sanity
  const point = 1.0 / (1.0 - r)
  
  return parseFloat(Math.min(point, max).toFixed(2))
}

// Multiplier grows exponentially with time.
// E.g., at 0.06 growth rate:
// 10 seconds -> ~1.8x
// 20 seconds -> ~3.3x
// 30 seconds -> ~6.0x
// 40 seconds -> ~11.0x
// 60 seconds -> ~36.6x
const GROWTH_RATE = 0.06

export function calculateMultiplier(startTimeMs: number, currentTimeMs: number): number {
  const elapsed = currentTimeMs - startTimeMs
  if (elapsed <= 0) return 1.00
  const secs = elapsed / 1000
  return parseFloat(Math.pow(Math.E, GROWTH_RATE * secs).toFixed(2))
}

export function calculateTimeMsForMultiplier(multiplier: number): number {
  if (multiplier <= 1.00) return 0
  const secs = Math.log(multiplier) / GROWTH_RATE
  return secs * 1000
}
