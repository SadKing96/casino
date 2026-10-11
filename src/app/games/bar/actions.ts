'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { logGameHistory } from '@/lib/admin'

export async function submitBarShift(tipsEarned: number, customersServed: number) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Not logged in")

  if (tipsEarned <= 0) return { profit: 0 }

  await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: tipsEarned } }
  })

  await logGameHistory({
    userId,
    gameType: 'BAR',
    tableId: 'solo-bar', // Not multiplayer so we just use a generic ID or omit if optional, but it might be required. Let's use 'solo'
    betAmount: 0, // No bet, just pure profit mini-game
    payout: tipsEarned,
    details: { customersServed }
  })

  return { profit: tipsEarned }
}
