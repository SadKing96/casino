'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import { getWalletHistory, type WalletEntry } from '@/app/walletActions'
import { amountColor, entryTitle, formatAmount } from '@/components/WalletHistoryList'

const PAGE_SIZE = 50
const FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'WINS', label: 'Winnings' },
  { id: 'LOSSES', label: 'Losses' },
  { id: 'ADMIN', label: 'Admin' },
] as const
type Filter = typeof FILTERS[number]['id']

export default function WalletPage() {
  const { user } = useUser()
  const [filter, setFilter] = useState<Filter>('ALL')
  const [page, setPage] = useState(0)
  const [entries, setEntries] = useState<WalletEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await getWalletHistory({ take: PAGE_SIZE, skip: page * PAGE_SIZE, filter })
    setEntries(r.entries)
    setTotal(r.total)
    setLoading(false)
  }, [page, filter])

  useEffect(() => { load() }, [load])

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <main style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Link href="/" style={{ color: 'var(--neon-gold)', textDecoration: 'none', fontSize: '0.9rem', opacity: 0.8 }}>← Back to Lobby</Link>

      <section className="glass-panel" style={{ padding: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Wallet History</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.6, fontSize: '0.9rem' }}>{total.toLocaleString()} transaction{total === 1 ? '' : 's'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', opacity: 0.7, color: 'var(--neon-gold)' }}>Current Balance</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--neon-gold)', textShadow: '0 0 18px rgba(255,204,0,0.35)' }}>
            ${(user?.credits ?? 0).toLocaleString()}
          </div>
        </div>
      </section>

      <section className="glass-panel" style={{ padding: '20px' }}>
        <div role="group" aria-label="Filter transactions" style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.id} id={`wallet-filter-${f.id.toLowerCase()}`} className="wallet-chip" aria-pressed={filter === f.id}
              onClick={() => { setFilter(f.id); setPage(0) }}>
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="wallet-table">
            <thead>
              <tr><th>Date</th><th>Description</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ textAlign: 'right' }}>Balance</th></tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td style={{ opacity: 0.7, whiteSpace: 'nowrap' }}>{new Date(e.createdAt).toLocaleString()}</td>
                  <td>{entryTitle(e)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: amountColor(e.amount), fontVariantNumeric: 'tabular-nums' }}>{formatAmount(e.amount)}</td>
                  <td style={{ textAlign: 'right', opacity: 0.8, fontVariantNumeric: 'tabular-nums' }}>${e.balanceAfter.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && entries.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>No transactions found.</div>
          )}
        </div>

        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
            <button id="wallet-prev" className="wallet-chip" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Newer</button>
            <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>Page {page + 1} of {pages}</span>
            <button id="wallet-next" className="wallet-chip" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>Older →</button>
          </div>
        )}
      </section>
    </main>
  )
}
