export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'

export interface Card {
  suit: Suit
  rank: Rank
}

export type HandRank = 'Straight Flush' | 'Three of a Kind' | 'Straight' | 'Flush' | 'Pair' | 'High Card'

export interface EvaluatedHand {
  rank: HandRank
  values: number[] // Sort by importance for tie-breaking
  name: string
}

export interface PlayerState {
  hand: Card[]
  betAnte: number
  betPairPlus: number
  betPlay: number
  status: 'WAITING' | 'PLAY' | 'FOLD' | 'RESOLVED'
  payout: number
}

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
}

export function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
  const deck: Card[] = []
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank })
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

export function evaluate3CardHand(hand: Card[]): EvaluatedHand {
  const vals = hand.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a)
  const isFlush = hand[0].suit === hand[1].suit && hand[1].suit === hand[2].suit
  
  // Check straight
  let isStraight = false
  let straightHigh = vals[0]
  if (vals[0] === vals[1] + 1 && vals[1] === vals[2] + 1) {
    isStraight = true
  } else if (vals[0] === 14 && vals[1] === 3 && vals[2] === 2) {
    // A, 3, 2 straight (A is low)
    isStraight = true
    straightHigh = 3 // 3 is the high card in A,2,3 straight
    // reorder vals for tie-breaking: 3, 2, 14
    vals[0] = 3; vals[1] = 2; vals[2] = 14;
  }

  const isThreeOfAKind = vals[0] === vals[1] && vals[1] === vals[2]
  const isPair = vals[0] === vals[1] || vals[1] === vals[2]
  let pairVal = 0
  let kicker = 0
  if (isPair && !isThreeOfAKind) {
    if (vals[0] === vals[1]) { pairVal = vals[0]; kicker = vals[2] }
    else { pairVal = vals[1]; kicker = vals[0] }
  }

  if (isStraight && isFlush) return { rank: 'Straight Flush', values: [straightHigh], name: 'Straight Flush' }
  if (isThreeOfAKind) return { rank: 'Three of a Kind', values: [vals[0]], name: 'Three of a Kind' }
  if (isStraight) return { rank: 'Straight', values: [straightHigh], name: 'Straight' }
  if (isFlush) return { rank: 'Flush', values: vals, name: 'Flush' }
  if (isPair) return { rank: 'Pair', values: [pairVal, kicker], name: 'Pair' }
  return { rank: 'High Card', values: vals, name: 'High Card' }
}

// Returns >0 if h1 wins, <0 if h2 wins, 0 if tie
export function compareHands(h1: EvaluatedHand, h2: EvaluatedHand): number {
  const rankOrder: Record<HandRank, number> = {
    'Straight Flush': 6, 'Three of a Kind': 5, 'Straight': 4, 'Flush': 3, 'Pair': 2, 'High Card': 1
  }
  
  if (rankOrder[h1.rank] !== rankOrder[h2.rank]) {
    return rankOrder[h1.rank] - rankOrder[h2.rank]
  }

  for (let i = 0; i < h1.values.length; i++) {
    if (h1.values[i] !== h2.values[i]) {
      return h1.values[i] - h2.values[i]
    }
  }
  return 0
}

export function dealerQualifies(hand: Card[]): boolean {
  const evalHand = evaluate3CardHand(hand)
  // Dealer qualifies with Queen high or better
  if (evalHand.rank !== 'High Card') return true
  return evalHand.values[0] >= RANK_VALUES['Q']
}

export function calculatePairPlusPayout(rank: HandRank): number {
  switch (rank) {
    case 'Straight Flush': return 40
    case 'Three of a Kind': return 30
    case 'Straight': return 6
    case 'Flush': return 3
    case 'Pair': return 1
    default: return -1 // loses the bet
  }
}

export function calculateAnteBonus(rank: HandRank): number {
  switch (rank) {
    case 'Straight Flush': return 5
    case 'Three of a Kind': return 4
    case 'Straight': return 1
    default: return 0
  }
}
