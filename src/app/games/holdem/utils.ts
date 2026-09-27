import * as PokerSolver from 'pokersolver'

export type Card = {
  suit: '♥️' | '♦️' | '♠️' | '♣️'
  rank: string
  hidden?: boolean
}

export type PlayerState = {
  id: string
  name: string
  chips: number
  cards: Card[]
  currentBet: number
  status: 'ACTIVE' | 'FOLDED' | 'ALL_IN' | 'OUT'
  isBot: boolean
}

export const SUITS: Card['suit'][] = ['♥️', '♦️', '♠️', '♣️']
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

export function generateDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank })
    }
  }
  return shuffleDeck(deck)
}

function shuffleDeck(deck: Card[]): Card[] {
  const newDeck = [...deck]
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]]
  }
  return newDeck
}

// Convert our Card type to PokerSolver format (e.g. "As", "10d")
export function toPokerSolverFormat(card: Card): string {
  let rankStr = card.rank
  if (rankStr === '10') rankStr = 'T'
  
  let suitStr = 's'
  if (card.suit === '♥️') suitStr = 'h'
  else if (card.suit === '♦️') suitStr = 'd'
  else if (card.suit === '♣️') suitStr = 'c'
  
  return `${rankStr}${suitStr}`
}

export function evaluateBestHand(holeCards: Card[], communityCards: Card[]) {
  const Hand = PokerSolver.Hand
  const allCards = [...holeCards, ...communityCards].map(toPokerSolverFormat)
  return Hand.solve(allCards)
}
