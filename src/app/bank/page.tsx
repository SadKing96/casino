'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/context/UserContext'
import { buyCoins, depositChips, withdrawChips } from '@/app/actions'
import { useRouter } from 'next/navigation'

export default function BankPage() {
  const { user, setUser } = useUser()
  const router = useRouter()
  
  const [fiatDepositAmount, setFiatDepositAmount] = useState<number>(1000)
  const [buyChipsAmount, setBuyChipsAmount] = useState<number>(100)
  const [cashOutAmount, setCashOutAmount] = useState<number>(100)
  const [isLoading, setIsLoading] = useState(false)

  // In a real app we'd redirect if no user, but since Guest login is fast, we'll just wait
  if (!user) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Please login or play as Guest to access the Bank.</div>
  }

  const handleDepositFiat = async () => {
    try {
      setIsLoading(true)
      const updatedUser = await buyCoins(fiatDepositAmount)
      setUser(updatedUser)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBuyChips = async () => {
    try {
      setIsLoading(true)
      const updatedUser = await withdrawChips(buyChipsAmount)
      setUser(updatedUser)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCashOut = async () => {
    try {
      setIsLoading(true)
      const updatedUser = await depositChips(cashOutAmount)
      setUser(updatedUser)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <h1 className="text-gradient-gold" style={{ textAlign: 'center', fontSize: '3rem', margin: 0 }}>The Vault</h1>
      
      {/* Balances Display */}
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <div className="glass-panel" style={{ flex: '1', minWidth: '300px', padding: '30px', textAlign: 'center', border: '1px solid #00cc66' }}>
          <h2 style={{ margin: '0 0 10px 0', opacity: 0.8 }}>Bank Balance (USD)</h2>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: '#00cc66' }}>${user.bankBalance.toLocaleString()}</div>
        </div>
        <div className="glass-panel" style={{ flex: '1', minWidth: '300px', padding: '30px', textAlign: 'center', border: '1px solid var(--neon-gold)' }}>
          <h2 style={{ margin: '0 0 10px 0', opacity: 0.8 }}>Casino Chips</h2>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--neon-gold)' }}>{user.chipBalance.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* Deposit Fiat Panel */}
        <div className="glass-panel" style={{ flex: '1', minWidth: '300px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ margin: 0, color: '#00cc66' }}>Deposit Funds</h3>
          <p style={{ opacity: 0.7, margin: 0 }}>Add money to your bank account via Wire Transfer, Credit Card, or Crypto.</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span style={{ fontSize: '2rem', color: '#00cc66' }}>$</span>
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

        {/* Buy Chips Panel */}
        <div className="glass-panel" style={{ flex: '1', minWidth: '300px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ margin: 0, color: 'var(--neon-gold)' }}>Buy Chips</h3>
          <p style={{ opacity: 0.7, margin: 0 }}>Exchange your Bank USD for Casino Chips at a 1:1 ratio.</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span style={{ fontSize: '2rem', color: 'var(--neon-gold)' }}>$</span>
            <input 
              type="number" 
              value={buyChipsAmount} 
              onChange={e => setBuyChipsAmount(Number(e.target.value))}
              style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '10px', fontSize: '1.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--neon-gold)', color: '#fff', borderRadius: '8px' }} 
            />
          </div>
          <button onClick={handleBuyChips} disabled={isLoading} className="btn-primary" style={{ padding: '15px', fontSize: '1.2rem', fontWeight: 'bold' }}>
            {isLoading ? 'Processing...' : 'Purchase Chips'}
          </button>
        </div>

        {/* Cash Out Panel */}
        <div className="glass-panel" style={{ flex: '1', minWidth: '300px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ margin: 0, color: '#fff' }}>Cash Out Chips</h3>
          <p style={{ opacity: 0.7, margin: 0 }}>Convert your Casino Chips back to Bank USD.</p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem', color: '#fff' }}>Chips:</span>
            <input 
              type="number" 
              value={cashOutAmount} 
              onChange={e => setCashOutAmount(Number(e.target.value))}
              style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '10px', fontSize: '1.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid #aaa', color: '#fff', borderRadius: '8px' }} 
            />
          </div>
          <button onClick={handleCashOut} disabled={isLoading} className="btn-secondary" style={{ padding: '15px', fontSize: '1.2rem', fontWeight: 'bold' }}>
            {isLoading ? 'Processing...' : 'Cash Out to Bank'}
          </button>
        </div>
      </div>
    </div>
  )
}
