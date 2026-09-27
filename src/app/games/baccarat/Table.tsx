'use client'

import { useUser } from '@/context/UserContext'
import { getTableState, placeBet, dealCards, clearTable } from './actions'
import { BaccaratBet, BaccaratBetType, Card, calculateHandScore } from './utils'
import { useState, useEffect } from 'react'

export default function BaccaratTableUI({ tableId, onLeave }: { tableId: string, onLeave: () => void }) {
  const { user, updateBalances } = useUser()
  const [table, setTable] = useState<any>(null)
  const [selectedChip, setSelectedChip] = useState<number>(10)
  const [isProcessing, setIsProcessing] = useState(false)
  const [chatLog, setChatLog] = useState<string[]>([])

  // Parse state
  const activeBets: BaccaratBet[] = table?.activeBets ? JSON.parse(table.activeBets) : []
  const playerHand: Card[] = table?.playerHand ? JSON.parse(table.playerHand) : []
  const bankerHand: Card[] = table?.bankerHand ? JSON.parse(table.bankerHand) : []
  
  const pScore = playerHand.length > 0 ? calculateHandScore(playerHand) : null
  const bScore = bankerHand.length > 0 ? calculateHandScore(bankerHand) : null

  useEffect(() => {
    loadTable()
    const interval = setInterval(loadTable, 1000)
    return () => clearInterval(interval)
  }, [])

  const loadTable = async () => {
    const state = await getTableState(tableId)
    setTable(state)
    if (state?.chatHistory) {
      setChatLog(JSON.parse(state.chatHistory))
    }
  }

  const handleBet = async (type: BaccaratBetType) => {
    if (!user || isProcessing || table?.status !== 'BETTING') return
    setIsProcessing(true)
    try {
      await placeBet(tableId, selectedChip, type)
      updateBalances(user.chipBalance - selectedChip, user.bankBalance)
      await loadTable()
    } catch (e: any) {
      alert(e.message)
    }
    setIsProcessing(false)
  }

  const handleDeal = async () => {
    if (isProcessing) return
    setIsProcessing(true)
    try {
      await dealCards(tableId)
      await loadTable()
      // Wait 5 seconds, then clear table
      setTimeout(async () => {
        await clearTable(tableId)
        await loadTable()
        // Refresh user balance from server to reflect payouts
        const { getUser } = await import('@/app/actions')
        const freshUser = await getUser()
        if (freshUser) {
          updateBalances(freshUser.chipBalance, freshUser.bankBalance)
        }
      }, 5000)
    } catch (e: any) {
      alert(e.message)
    }
    setIsProcessing(false)
  }

  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case 'hearts': return '♥️'
      case 'diamonds': return '♦️'
      case 'clubs': return '♣️'
      case 'spades': return '♠️'
      default: return ''
    }
  }

  const renderCard = (card: Card, index: number) => {
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds'
    return (
      <div key={index} style={{
        width: '60px', height: '90px', 
        background: 'white', borderRadius: '8px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: isRed ? '#e53935' : '#212121',
        fontSize: '1.5rem', fontWeight: 'bold',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        border: '1px solid #ccc',
        position: 'relative',
        transform: `translate(${index * 15}px, ${index * 5}px) rotate(${index * 5 - 5}deg)`,
        marginLeft: index > 0 ? '-30px' : '0'
      }}>
        <div style={{ position: 'absolute', top: '4px', left: '6px', fontSize: '1rem', lineHeight: 1 }}>
          {card.rank}<br/><span style={{ fontSize: '0.8rem'}}>{getSuitSymbol(card.suit)}</span>
        </div>
        <div style={{ fontSize: '2rem' }}>{getSuitSymbol(card.suit)}</div>
      </div>
    )
  }

  if (!table) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Table...</div>

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: '20px' }}>
      
      {/* Left: Chat & Controls */}
      <div className="glass-panel" style={{ width: '300px', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <button className="btn-secondary" onClick={onLeave} style={{ marginBottom: '20px' }}>← Leave Table</button>
        
        <h2 style={{ fontSize: '1.2rem', marginBottom: '10px', color: 'var(--neon-gold)' }}>Table Rules</h2>
        <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '20px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
          <div>Player: 1 to 1</div>
          <div>Banker: 1 to 1 (5% Commission)</div>
          <div>Tie: 8 to 1</div>
        </div>

        <h2 style={{ fontSize: '1.2rem', marginBottom: '10px', color: 'var(--neon-gold)' }}>Action Log</h2>
        <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {chatLog.map((log, i) => (
            <div key={i} style={{ color: log.includes('won') ? '#00ffcc' : 'white' }}>{log}</div>
          ))}
          {chatLog.length === 0 && <div style={{ opacity: 0.5 }}>Waiting for bets...</div>}
        </div>
      </div>

      {/* Center: The Baccarat Baize */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Game State Header */}
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{table.name}</h2>
            <div style={{ color: table.status === 'BETTING' ? '#00ffcc' : '#ff3366', fontWeight: 'bold' }}>
              {table.status === 'BETTING' ? 'PLACE YOUR BETS' : 'DEALING...'}
            </div>
          </div>
          {table.status === 'BETTING' && (
            <button className="btn-primary" onClick={handleDeal} disabled={isProcessing} style={{ padding: '10px 30px', fontSize: '1.2rem' }}>
              DEAL CARDS
            </button>
          )}
        </div>

        {/* The Felt */}
        <div className="glass-panel" style={{ flex: 1, background: 'linear-gradient(135deg, #004d40 0%, #00251a 100%)', border: '2px solid #00695c', borderRadius: '20px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          
          {/* Card Displays */}
          <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', marginBottom: '60px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', letterSpacing: '2px' }}>
                Player {pScore !== null && <span style={{ color: 'var(--neon-gold)' }}>({pScore})</span>}
              </div>
              <div style={{ display: 'flex', height: '100px' }}>
                {playerHand.length > 0 ? playerHand.map((c, i) => renderCard(c, i)) : <div style={{ width: '60px', height: '90px', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '8px' }}></div>}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', letterSpacing: '2px' }}>
                Banker {bScore !== null && <span style={{ color: 'var(--neon-gold)' }}>({bScore})</span>}
              </div>
              <div style={{ display: 'flex', height: '100px' }}>
                {bankerHand.length > 0 ? bankerHand.map((c, i) => renderCard(c, i)) : <div style={{ width: '60px', height: '90px', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '8px' }}></div>}
              </div>
            </div>
          </div>

          {/* Betting Areas */}
          <div style={{ display: 'flex', gap: '20px', width: '100%', maxWidth: '800px', height: '150px' }}>
            
            <div 
              onClick={() => handleBet('PLAYER')}
              style={{ 
                flex: 1, border: '2px solid rgba(255,255,255,0.3)', borderRadius: '100px', 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: table.status === 'BETTING' ? 'pointer' : 'not-allowed',
                background: 'rgba(255,255,255,0.05)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { if (table.status === 'BETTING') Object.assign(e.currentTarget.style, { background: 'rgba(255,255,255,0.1)', borderColor: '#00ffcc' }) }}
              onMouseLeave={e => { Object.assign(e.currentTarget.style, { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.3)' }) }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00ffcc', letterSpacing: '2px' }}>PLAYER</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>1:1</div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {activeBets.filter(b => b.type === 'PLAYER').map((b, i) => (
                  <div key={i} style={{ background: 'var(--neon-blue)', color: '#000', padding: '2px 6px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    ${b.amount}
                  </div>
                ))}
              </div>
            </div>

            <div 
              onClick={() => handleBet('TIE')}
              style={{ 
                flex: 0.6, border: '2px solid rgba(255,255,255,0.3)', borderRadius: '100px', 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: table.status === 'BETTING' ? 'pointer' : 'not-allowed',
                background: 'rgba(255,255,255,0.05)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { if (table.status === 'BETTING') Object.assign(e.currentTarget.style, { background: 'rgba(255,255,255,0.1)', borderColor: '#ffcc00' }) }}
              onMouseLeave={e => { Object.assign(e.currentTarget.style, { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.3)' }) }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffcc00', letterSpacing: '2px' }}>TIE</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>8:1</div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {activeBets.filter(b => b.type === 'TIE').map((b, i) => (
                  <div key={i} style={{ background: 'var(--neon-gold)', color: '#000', padding: '2px 6px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    ${b.amount}
                  </div>
                ))}
              </div>
            </div>

            <div 
              onClick={() => handleBet('BANKER')}
              style={{ 
                flex: 1, border: '2px solid rgba(255,255,255,0.3)', borderRadius: '100px', 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: table.status === 'BETTING' ? 'pointer' : 'not-allowed',
                background: 'rgba(255,255,255,0.05)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { if (table.status === 'BETTING') Object.assign(e.currentTarget.style, { background: 'rgba(255,255,255,0.1)', borderColor: '#ff3366' }) }}
              onMouseLeave={e => { Object.assign(e.currentTarget.style, { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.3)' }) }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff3366', letterSpacing: '2px' }}>BANKER</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>1:1 (5% Comm)</div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {activeBets.filter(b => b.type === 'BANKER').map((b, i) => (
                  <div key={i} style={{ background: '#ff3366', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    ${b.amount}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Chip Selection */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ opacity: 0.7 }}>Select Chip:</div>
          {[10, 50, 100, 500, 1000].map(amount => (
            <div 
              key={amount}
              onClick={() => setSelectedChip(amount)}
              style={{
                width: '60px', height: '60px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', cursor: 'pointer',
                background: selectedChip === amount ? 'radial-gradient(circle, var(--neon-gold) 0%, #cc8800 100%)' : 'radial-gradient(circle, #444 0%, #222 100%)',
                color: selectedChip === amount ? '#000' : '#fff',
                border: `3px dashed ${selectedChip === amount ? '#fff' : '#666'}`,
                transform: selectedChip === amount ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.2s',
                boxShadow: selectedChip === amount ? '0 0 15px var(--neon-gold)' : '0 4px 6px rgba(0,0,0,0.3)'
              }}
            >
              ${amount}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
