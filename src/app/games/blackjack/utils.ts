export type Card = { rank: string, suit: string, hidden?: boolean }

export function getCardValue(rank: string): number {
  if (['J', 'Q', 'K'].includes(rank)) return 10
  if (rank === 'A') return 11
  return parseInt(rank)
}

export function calculateScore(hand: Card[]): number {
  let score = 0
  let aces = 0
  for (const card of hand) {
    if (card.hidden) continue
    const val = getCardValue(card.rank)
    score += val
    if (card.rank === 'A') aces++
  }
  while (score > 21 && aces > 0) {
    score -= 10
    aces--
  }
  return score
}

export function calculateScoreString(hand: Card[]): string {
  let score = 0
  let aces = 0
  for (const card of hand) {
    if (card.hidden) continue
    const val = getCardValue(card.rank)
    score += val
    if (card.rank === 'A') aces++
  }
  
  if (aces > 0 && score <= 21) {
    const hardScore = score - 10
    if (hardScore > 0 && score !== hardScore && score !== 21) {
      return `${hardScore} or ${score}`
    }
  }
  
  while (score > 21 && aces > 0) {
    score -= 10
    aces--
  }
  
  return score.toString()
}

export function generateShoe(deckCount: number = 6): Card[] {
  const SUITS = ['♠️', '♥️', '♣️', '♦️']
  const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']
  const shoe: Card[] = []
  
  for (let i = 0; i < deckCount; i++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push({ rank, suit })
      }
    }
  }
  
  // Fisher-Yates Shuffle
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  
  return shoe
}

export function drawCards(shoe: Card[], count: number): { drawn: Card[], newShoe: Card[] } {
  let currentShoe = [...shoe]
  // Auto-shuffle if shoe runs low (< 20% of 6 decks = < 60 cards)
  if (currentShoe.length < 60) {
    currentShoe = generateShoe(6)
  }
  
  const drawn = currentShoe.splice(0, count)
  return { drawn, newShoe: currentShoe }
}

export function evaluate21Plus3(pCards: Card[], dUpcard: Card): number {
  if (pCards.length !== 2 || !dUpcard) return 0;
  const hand = [pCards[0], pCards[1], dUpcard];
  const suits = hand.map(c => c.suit);
  const ranks = hand.map(c => c.rank);
  
  const isFlush = suits[0] === suits[1] && suits[1] === suits[2];
  const isThreeOfAKind = ranks[0] === ranks[1] && ranks[1] === ranks[2];
  
  const rankValues = ranks.map(r => {
    if (r === 'A') return 14;
    if (r === 'K') return 13;
    if (r === 'Q') return 12;
    if (r === 'J') return 11;
    return parseInt(r);
  }).sort((a,b) => a-b);
  
  let isStraight = false;
  if (rankValues[0] + 1 === rankValues[1] && rankValues[1] + 1 === rankValues[2]) isStraight = true;
  // A, 2, 3 straight
  if (rankValues[0] === 2 && rankValues[1] === 3 && rankValues[2] === 14) isStraight = true;

  if (isThreeOfAKind && isFlush) return 100;
  if (isStraight && isFlush) return 40;
  if (isThreeOfAKind) return 30;
  if (isStraight) return 10;
  if (isFlush) return 5;
  return 0;
}

export function evaluatePerfectPairs(pCards: Card[]): number {
  if (pCards.length !== 2) return 0;
  const c1 = pCards[0];
  const c2 = pCards[1];
  
  if (c1.rank !== c2.rank) return 0;
  
  const c1Red = ['♥️', '♦️'].includes(c1.suit);
  const c2Red = ['♥️', '♦️'].includes(c2.suit);
  
  if (c1.suit === c2.suit) return 25; // Perfect Pair
  if (c1Red === c2Red) return 12; // Colored Pair
  return 5; // Mixed Pair
}

export function evaluateLuckyLadies(pCards: Card[], dealerHasBlackjack: boolean): number {
  if (pCards.length !== 2) return 0;
  const score = calculateScore(pCards);
  if (score !== 20) return 0;
  
  const c1 = pCards[0];
  const c2 = pCards[1];
  const isQueens = c1.rank === 'Q' && c2.rank === 'Q';
  const isHearts = c1.suit === '♥️' && c2.suit === '♥️';
  
  if (isQueens && isHearts) {
    if (dealerHasBlackjack) return 1000;
    return 200;
  }
  
  if (c1.rank === c2.rank && c1.suit === c2.suit) return 25; // Matched 20
  if (c1.suit === c2.suit) return 10; // Suited 20
  return 4; // Any 20
}

export function evaluateBustIt(dealerHand: Card[]): number {
  const dScore = calculateScore(dealerHand);
  if (dScore <= 21) return 0;
  
  const count = dealerHand.length;
  if (count === 3) return 1; 
  if (count === 4) return 2;
  if (count === 5) return 9;
  if (count === 6) return 50;
  if (count === 7) return 100;
  if (count >= 8) return 250;
  return 0;
}
