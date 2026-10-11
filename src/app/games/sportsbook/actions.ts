'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function placeBet(eventId: string, sportKey: string, team: string, odds: number, amount: number) {
  if (amount <= 0) throw new Error("Invalid bet amount")

  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error("User not found")

  if (user.credits < amount) {
    throw new Error("Insufficient credits")
  }

  // Deduct chips and place bet within a transaction to ensure consistency
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } }
    }),
    prisma.sportsBet.create({
      data: {
        userId,
        eventId,
        sportKey,
        team,
        odds,
        amount,
        status: 'PENDING'
      }
    })
  ])

  revalidatePath('/games/sportsbook')
  revalidatePath('/admin')
}

export async function getMyBets() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) return []

  return await prisma.sportsBet.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
}
