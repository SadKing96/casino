export type RouletteBetType = 
  | `STRAIGHT_UP_${string}`
  | '1ST_12' | '2ND_12' | '3RD_12'
  | 'COL_1' | 'COL_2' | 'COL_3'
  | '1_TO_18' | '19_TO_36'
  | 'EVEN' | 'ODD'
  | 'RED' | 'BLACK'

export interface RouletteBet {
  id: string
  userId: string
  username: string
  type: RouletteBetType
  amount: number
  isResolved: boolean
  wonAmount?: number
}

export const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].map(String)
export const BLACK_NUMBERS = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35].map(String)

export const ALL_NUMBERS = ['00', '0', ...Array.from({length: 36}, (_, i) => String(i + 1))]

export const getNumberColor = (num: string) => {
  if (num === '0' || num === '00') return 'green'
  if (RED_NUMBERS.includes(num)) return 'red'
  return 'black'
}

export const PAYOUTS: Record<string, number> = {
  STRAIGHT_UP: 35,
  DOZENS: 2,
  COLUMNS: 2,
  OUTSIDE_EVEN_ODD: 1,
}

export const getRandomNumber = (): string => {
  return ALL_NUMBERS[Math.floor(Math.random() * ALL_NUMBERS.length)]
}
