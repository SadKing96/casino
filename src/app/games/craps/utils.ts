export type CrapsBetType = 
  | 'PASS_LINE' | 'DONT_PASS' 
  | 'COME' | 'DONT_COME'
  | 'FIELD'
  | 'PLACE_4' | 'PLACE_5' | 'PLACE_6' | 'PLACE_8' | 'PLACE_9' | 'PLACE_10'
  | 'HARD_4' | 'HARD_6' | 'HARD_8' | 'HARD_10'
  | 'ANY_SEVEN' | 'ANY_CRAPS'

export type CrapsBet = {
  id: string
  userId: string
  username: string
  type: CrapsBetType
  amount: number
  isResolved: boolean
  wonAmount?: number
  // For Come/Don't Come bets that travel to a point
  point?: number 
}

// Payout multipliers for winning bets. 
// A payout of 1 means 1:1 (bet 10, get your 10 back + 10 win).
// Place bets are true odds payoffs, assuming standard $5 minimum increments for simplicity.
export const PAYOUTS: Record<CrapsBetType, number> = {
  'PASS_LINE': 1,
  'DONT_PASS': 1,
  'COME': 1,
  'DONT_COME': 1,
  'FIELD': 1, // Field 2 and 12 usually pay 2:1, handled in logic
  'PLACE_4': 9/5,
  'PLACE_5': 7/5,
  'PLACE_6': 7/6,
  'PLACE_8': 7/6,
  'PLACE_9': 7/5,
  'PLACE_10': 9/5,
  'HARD_4': 7,
  'HARD_6': 9,
  'HARD_8': 9,
  'HARD_10': 7,
  'ANY_SEVEN': 4,
  'ANY_CRAPS': 7
}

export function rollTwoDice(): [number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1
  ]
}
