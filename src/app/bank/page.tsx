'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/context/UserContext'
import { buyCoins, depositCredits, getUserTransactions } from '@/app/actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function BankPage() {
  const { user, setUser } = useUser()
  const router = useRouter()
  
  const [fiatDepositAmount, setFiatDepositAmount] = useState<number>(1000)
  const [cashOutAmount, setCashOutAmount] = useState<number>(100)
  const [isLoading, setIsLoading] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    if (user) {
      loadTransactions()
    }
  }, [user])

  const loadTransactions = async () => {
    const txs = await getUserTransactions()
    setTransactions(txs)
  }

  // In a real app we'd redirect if no user, but since Guest login is fast, we'll just wait
  if (!user) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Please login or play as Guest to access the Bank.</div>
  }

  const handleDepositFiat = async () => {
    try {
      setIsLoading(true)
      const updatedUser = await buyCoins(fiatDepositAmount)
      setUser(updatedUser)
      await loadTransactions()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCashOut = async () => {
    try {
      setIsLoading(true)
      const updatedUser = await depositCredits(cashOutAmount)
      setUser(updatedUser)
      await loadTransactions()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-gradient-gold" style={{ fontSize: '3.5rem', margin: 0 }}>The Vault</h1>
        <Link href="/" className="btn-secondary" style={{ padding: '10px 20px', fontSize: '1.2rem' }}>← Back to Casino</Link>
      </div>
      
      <div style={{ display: 'flex', gap: '40px', alignItems: 'stretch', flexWrap: 'wrap' }}>
        
        {/* Left Column: Ledger */}
        <div style={{ flex: '1', minWidth: '320px', display: 'flex', flexDirection: 'column' }}>
          <div className="glass-panel" style={{ padding: '30px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#ffcc00' }}>Transaction Ledger</h2>
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {transactions.length === 0 ? (
                <p style={{ color: '#aaa', textAlign: 'center', marginTop: '40px' }}>No transactions yet.</p>
              ) : (
                transactions.map(tx => (
                  <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(0,0,0,0.4)', borderRadius: '10px', borderLeft: `4px solid ${tx.type === 'FIAT_DEPOSIT' ? '#00cc66' : '#ff4444'}` }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '1.1rem' }}>{tx.type === 'FIAT_DEPOSIT' ? 'Deposit' : 'Cash Out'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '4px' }}>{new Date(tx.createdAt).toLocaleString()}</div>
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: tx.type === 'FIAT_DEPOSIT' ? '#00cc66' : '#ff4444' }}>
                      {tx.type === 'FIAT_DEPOSIT' ? '+' : '-'}${tx.amount.toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Center Column: Actions */}
        <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '30px', minWidth: '400px' }}>
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', border: '1px solid var(--neon-gold)' }}>
            <h2 style={{ margin: '0 0 10px 0', opacity: 0.8, color: '#fff' }}>Available Credits</h2>
            <div style={{ fontSize: '5rem', fontWeight: 'bold', color: 'var(--neon-gold)' }}>{user.credits.toLocaleString()}</div>
          </div>

          <div style={{ display: 'flex', gap: '20px', flex: 1, flexWrap: 'wrap' }}>
            <div className="glass-panel" style={{ flex: '1', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '250px' }}>
              <h3 style={{ margin: 0, color: '#00cc66', fontSize: '1.5rem' }}>Deposit Funds</h3>
              <p style={{ opacity: 0.7, margin: 0 }}>Add credits to your account.</p>
              <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                <span style={{ fontSize: '2rem', color: '#00cc66', alignSelf: 'center' }}>$</span>
                <input 
                  type="number" 
                  value={fiatDepositAmount} 
                  onChange={e => setFiatDepositAmount(Number(e.target.value))}
                  style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '10px', fontSize: '1.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid #00cc66', color: '#fff', borderRadius: '8px' }} 
                />
              </div>
              <button onClick={handleDepositFiat} disabled={isLoading} className="btn-primary" style={{ background: '#00cc66', padding: '15px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                {isLoading ? 'Processing...' : 'Deposit USD'}
              </button>
            </div>

            <div className="glass-panel" style={{ flex: '1', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '250px' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.5rem' }}>Cash Out</h3>
              <p style={{ opacity: 0.7, margin: 0 }}>Withdraw to your bank account.</p>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: 'auto' }}>
                <span style={{ fontSize: '1.5rem', color: '#ccc' }}>Cr:</span>
                <input 
                  type="number" 
                  value={cashOutAmount} 
                  onChange={e => setCashOutAmount(Number(e.target.value))}
                  style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '10px', fontSize: '1.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid #666', color: '#fff', borderRadius: '8px' }} 
                />
              </div>
              <button onClick={handleCashOut} disabled={isLoading} className="btn-secondary" style={{ padding: '15px', fontSize: '1.2rem', fontWeight: 'bold', width: '100%' }}>
                {isLoading ? 'Processing...' : 'Cash Out'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Account Status */}
        <div style={{ flex: '1', minWidth: '320px', display: 'flex', flexDirection: 'column' }}>
          <div className="glass-panel" style={{ padding: '30px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ margin: '0', color: '#ffcc00' }}>Account Status</h2>
            
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '15px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', color: '#ccc', marginBottom: '10px' }}>Current Tier</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: user.role === 'ADMIN' ? '#ff4444' : '#00cc66', textTransform: 'uppercase' }}>
                {user.role === 'ADMIN' ? 'Owner' : 'VIP Bronze'}
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                <span style={{ color: '#aaa' }}>Account ID</span>
                <span style={{ color: '#fff', fontFamily: 'monospace' }}>{user.id.substring(0, 8)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                <span style={{ color: '#aaa' }}>Security</span>
                <span style={{ color: '#00cc66' }}>Verified ✓</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#aaa' }}>Withdrawal Limit</span>
                <span style={{ color: '#fff' }}>Unlimited</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
