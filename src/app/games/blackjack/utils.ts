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
    // There is at least one ace that can be counted as 11
    // The "hard" score (where this ace is 1) would be score - 10
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
