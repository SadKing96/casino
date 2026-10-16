'use client'

import type { WalletEntry } from '@/app/walletActions'

const TYPE_LABEL: Record<string, string> = {
  ROUND: '',
  BET: 'Bet',
  WIN: 'Win',
  REFUND: 'Refund',
  ADMIN_ADJUST: 'Admin adjustment',
}

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export function formatAmount(n: number) {
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}$${Math.abs(n).toLocaleString()}`
}

export function amountColor(n: number) {
  return n > 0 ? 'var(--wallet-win, #00e6a8)' : n < 0 ? 'var(--wallet-loss, #ff4d6d)' : 'rgba(255,255,255,0.5)'
}

export function entryTitle(e: WalletEntry) {
  if (e.type === 'ADMIN_ADJUST') return 'Admin adjustment'
  const label = TYPE_LABEL[e.type]
  return label ? `${e.game ?? 'Game'} · ${label}` : (e.game ?? 'Game')
}

/** Compact list used in the lobby Money panel. */
export default function WalletHistoryList({ entries }: { entries: WalletEntry[] }) {
  if (entries.length === 0) {
    return <div style={{ opacity: 0.5, fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>No transactions yet.</div>
  }
  return (
    <ul className="wallet-list">
      {entries.map(e => (
        <li key={e.id} className="wallet-row">
          <div style={{ minWidth: 0 }}>
            <div className="wallet-row-title">{entryTitle(e)}</div>
            <div className="wallet-row-time">{timeAgo(e.createdAt)}</div>
          </div>
          <div className="wallet-row-amount" style={{ color: amountColor(e.amount) }}>{formatAmount(e.amount)}</div>
        </li>
      ))}
    </ul>
  )
}
