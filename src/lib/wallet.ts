import { prisma } from './prisma'
import { notifyUser } from './notify'

export type WalletTxType = 'ROUND' | 'BET' | 'WIN' | 'REFUND' | 'ADMIN_ADJUST'

/**
 * Records a wallet ledger entry. Call AFTER the credit change(s) for a round
 * have been applied, so balanceAfter reflects the final wallet balance.
 *
 * - Instant games (slots, keno, roulette...): one 'ROUND' entry with net = payout - bet.
 * - Deferred games (blackjack, sportsbook...): 'BET' (negative) when placed,
 *   'WIN' / 'REFUND' (positive) when settled. Losses need no settle entry.
 *
 * Never throws: a logging failure must not break gameplay.
 */
export async function recordWallet(
  userId: string,
  amount: number,
  type: WalletTxType,
  game?: string
) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } })
    if (!user) return
    await prisma.walletTransaction.create({
      data: {
        userId,
        amount: Math.round(amount),
        type,
        game,
        balanceAfter: user.credits,
      },
    })
    // Push the new balance to the user's open tabs (admin edits, payouts, etc.).
    // Skipped for instant 'ROUND' games: the acting tab updates itself after its
    // reel animation, and an early push would spoil the result.
    if (type !== 'ROUND') {
      await notifyUser(userId, 'credits_updated', { credits: user.credits })
    }
  } catch (e) {
    console.error('Failed to record wallet transaction:', e)
  }
}
