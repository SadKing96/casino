export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export interface Card {
  suit: Suit
  rank: Rank
}

export type BaccaratBetType = 'PLAYER' | 'BANKER' | 'TIE'

export interface BaccaratBet {
  userId: string
  type: BaccaratBetType
  amount: number
}

export function getCardValue(rank: Rank): number {
  if (['10', 'J', 'Q', 'K'].includes(rank)) return 0
  if (rank === 'A') return 1
  return parseInt(rank)
}

export function calculateHandScore(hand: Card[]): number {
  const sum = hand.reduce((total, card) => total + getCardValue(card.rank), 0)
  return sum % 10
}

export function createShoe(numDecks: number = 8): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const deck: Card[] = []
  
  for (let i = 0; i < numDecks; i++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank })
      }
    }
  }
  
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  
  return deck
}

// Determines if Player/Banker need third cards, and calculates the final winner.
// Pass in the initial 2-card hands, and a queue of next cards from the shoe to draw from if needed.
export function evaluateBaccaratRound(playerHand: Card[], bankerHand: Card[], nextCards: Card[]): { 
  playerFinal: Card[], bankerFinal: Card[], winner: 'PLAYER' | 'BANKER' | 'TIE', cardsDrawn: number 
} {
  let pHand = [...playerHand]
  let bHand = [...bankerHand]
  let cardsDrawn = 0
  
  const drawNext = () => {
    const card = nextCards[cardsDrawn]
    cardsDrawn++
    return card
  }

  const pScore = calculateHandScore(pHand)
  const bScore = calculateHandScore(bHand)
  
  // Natural 8 or 9
  if (pScore >= 8 || bScore >= 8) {
    return { 
      playerFinal: pHand, 
      bankerFinal: bHand, 
      winner: pScore > bScore ? 'PLAYER' : bScore > pScore ? 'BANKER' : 'TIE',
      cardsDrawn: 0
    }
  }

  // Player Third Card Rule
  let pThirdCard: Card | null = null
  let playerStands = true
  if (pScore <= 5) {
    pThirdCard = drawNext()
    pHand.push(pThirdCard)
    playerStands = false
  }

  // Banker Third Card Rule
  let bankerDraws = false
  if (playerStands) {
    if (bScore <= 5) bankerDraws = true
  } else if (pThirdCard) {
    const p3Value = getCardValue(pThirdCard.rank)
    if (bScore <= 2) bankerDraws = true
    else if (bScore === 3 && p3Value !== 8) bankerDraws = true
    else if (bScore === 4 && p3Value >= 2 && p3Value <= 7) bankerDraws = true
    else if (bScore === 5 && p3Value >= 4 && p3Value <= 7) bankerDraws = true
    else if (bScore === 6 && (p3Value === 6 || p3Value === 7)) bankerDraws = true
  }

  if (bankerDraws) {
    bHand.push(drawNext())
  }

  const finalPScore = calculateHandScore(pHand)
  const finalBScore = calculateHandScore(bHand)

  let winner: 'PLAYER' | 'BANKER' | 'TIE' = 'TIE'
  if (finalPScore > finalBScore) winner = 'PLAYER'
  else if (finalBScore > finalPScore) winner = 'BANKER'

  return { playerFinal: pHand, bankerFinal: bHand, winner, cardsDrawn }
}
