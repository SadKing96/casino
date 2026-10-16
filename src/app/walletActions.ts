'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export type WalletEntry = {
  id: string
  type: string
  game: string | null
  amount: number
  balanceAfter: number
  createdAt: string
}

/** Current user's wallet history, newest first. */
export async function getWalletHistory(opts: { take?: number; skip?: number; filter?: 'ALL' | 'WINS' | 'LOSSES' | 'ADMIN' } = {}) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) return { entries: [] as WalletEntry[], total: 0 }

  const take = Math.min(opts.take ?? 10, 100)
  const where: any = { userId }
  if (opts.filter === 'WINS') where.amount = { gt: 0 }
  if (opts.filter === 'LOSSES') where.amount = { lt: 0 }
  if (opts.filter === 'ADMIN') where.type = 'ADMIN_ADJUST'

  const [rows, total] = await Promise.all([
    prisma.walletTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip: opts.skip ?? 0 }),
    prisma.walletTransaction.count({ where }),
  ])

  return {
    entries: rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })) as WalletEntry[],
    total,
  }
}
