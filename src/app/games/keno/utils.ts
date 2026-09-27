export interface KenoBet {
  userId: string
  amount: number
  selectedNumbers: number[]
  profit: number
  hits: number
}

export function drawKenoNumbers(): number[] {
  const all = Array.from({ length: 80 }, (_, i) => i + 1)
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]]
  }
  return all.slice(0, 20).sort((a, b) => a - b)
}

// Simple payout multiplier table based on (spots picked) and (hits)
const PAYOUT_TABLE: Record<number, Record<number, number>> = {
  1: { 1: 3 },
  2: { 1: 1, 2: 9 },
  3: { 2: 2, 3: 24 },
  4: { 2: 1, 3: 4, 4: 90 },
  5: { 3: 2, 4: 15, 5: 450 },
  6: { 3: 1, 4: 5, 5: 50, 6: 1500 },
  7: { 3: 1, 4: 2, 5: 15, 6: 150, 7: 5000 },
  8: { 4: 2, 5: 10, 6: 50, 7: 400, 8: 15000 },
  9: { 4: 1, 5: 4, 6: 25, 7: 200, 8: 3000, 9: 25000 },
  10: { 0: 2, 5: 2, 6: 20, 7: 80, 8: 500, 9: 10000, 10: 100000 }
}

export function calculateKenoPayout(spots: number, hits: number): number {
  if (PAYOUT_TABLE[spots] && PAYOUT_TABLE[spots][hits] !== undefined) {
    return PAYOUT_TABLE[spots][hits]
  }
  return 0
}
