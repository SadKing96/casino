'use client'

import { useUser } from '@/context/UserContext'
import { getTableState, placeAnte, dealCards, placePlayBet, foldHand, resolveRound, clearTable } from './actions'
import { Card, PlayerState, evaluate3CardHand } from './utils'
import { useState, useEffect } from 'react'

export default function ThreeCardPokerTableUI({ tableId, onLeave }: { tableId: string, onLeave: () => void }) {
  const { user, updateBalances } = useUser()
  const [table, setTable] = useState<any>(null)
  const [selectedChip, setSelectedChip] = useState<number>(10)
  const [anteBet, setAnteBet] = useState(0)
  const [pairPlusBet, setPairPlusBet] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [chatLog, setChatLog] = useState<string[]>([])

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
    // Update user balance globally to reflect payouts seamlessly without full page refresh
    if (user && state?.status === 'RESOLVE') {
      const { getUser } = await import('@/app/actions')
      const freshUser = await getUser()
      if (freshUser) {
        updateBalances(freshUser.chipBalance, freshUser.bankBalance)
      }
    }
  }

  const handlePlaceBets = async () => {
    if (!user || isProcessing || table?.status !== 'ANTE') return
    if (anteBet === 0) {
      alert("You must place an Ante bet to play!")
      return
    }
    setIsProcessing(true)
    try {
      await placeAnte(tableId, anteBet, pairPlusBet)
      updateBalances(user.chipBalance - anteBet - pairPlusBet, user.bankBalance)
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
    } catch (e: any) {
      alert(e.message)
    }
    setIsProcessing(false)
  }

  const handlePlay = async () => {
    if (isProcessing) return
    setIsProcessing(true)
    try {
      await placePlayBet(tableId)
      const myState = JSON.parse(table.playerHands)[user?.id || '']
      updateBalances(user!.chipBalance - myState.betAnte, user!.bankBalance)
      await loadTable()
    } catch (e: any) {
      alert(e.message)
    }
    setIsProcessing(false)
  }

  const handleFold = async () => {
    if (isProcessing) return
    setIsProcessing(true)
    try {
      await foldHand(tableId)
      await loadTable()
    } catch (e: any) {
      alert(e.message)
    }
    setIsProcessing(false)
  }

  const handleResolve = async () => {
    if (isProcessing) return
    setIsProcessing(true)
    try {
      await resolveRound(tableId)
      await loadTable()
    } catch (e: any) {
      alert(e.message)
    }
    setIsProcessing(false)
  }

  const handleNextRound = async () => {
    if (isProcessing) return
    setIsProcessing(true)
    try {
      await clearTable(tableId)
      setAnteBet(0)
      setPairPlusBet(0)
      await loadTable()
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

  const renderCard = (card: Card, index: number, faceDown: boolean = false) => {
    if (faceDown) {
      return (
        <div key={index} style={{
          width: '70px', height: '100px', 
          background: 'repeating-linear-gradient(45deg, #000033, #000033 10px, #000066 10px, #000066 20px)', 
          borderRadius: '8px', border: '2px solid #fff',
          boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
          marginLeft: index > 0 ? '-35px' : '0'
        }} />
      )
    }
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds'
    return (
      <div key={index} style={{
        width: '70px', height: '100px', 
        background: 'white', borderRadius: '8px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: isRed ? '#e53935' : '#212121',
        fontSize: '1.5rem', fontWeight: 'bold',
        boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
        border: '1px solid #ccc',
        position: 'relative',
        marginLeft: index > 0 ? '-35px' : '0',
        transform: `rotate(${index * 10 - 10}deg)`
      }}>
        <div style={{ position: 'absolute', top: '4px', left: '6px', fontSize: '1rem', lineHeight: 1 }}>
          {card.rank}<br/><span style={{ fontSize: '0.8rem'}}>{getSuitSymbol(card.suit)}</span>
        </div>
        <div style={{ fontSize: '2.5rem' }}>{getSuitSymbol(card.suit)}</div>
      </div>
    )
  }

  if (!table || !user) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Table...</div>

  const playerHands = JSON.parse(table.playerHands)
  const dealerHand: Card[] = JSON.parse(table.dealerHand)
  const myState: PlayerState | undefined = playerHands[user.id]

  const amIHost = true // Currently, we'll let anyone trigger deal/resolve for demo purposes, or we can add host checks later.

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: '20px' }}>
      
      {/* Left: Chat & Rules */}
      <div className="glass-panel" style={{ width: '300px', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <button className="btn-secondary" onClick={onLeave} style={{ marginBottom: '20px' }}>← Leave Table</button>
        
        <h2 style={{ fontSize: '1.2rem', marginBottom: '10px', color: 'var(--neon-gold)' }}>Table Rules</h2>
        <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '20px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
          <div>Dealer Qualifies on Q-High</div>
          <div style={{ marginTop: '5px' }}><strong>Ante Bonus:</strong></div>
          <div>Straight Flush: 5 to 1</div>
          <div>Three of a Kind: 4 to 1</div>
          <div>Straight: 1 to 1</div>
          <div style={{ marginTop: '5px' }}><strong>Pair Plus:</strong></div>
          <div>Straight Flush: 40 to 1</div>
          <div>Three of a Kind: 30 to 1</div>
          <div>Straight: 6 to 1</div>
          <div>Flush: 3 to 1</div>
          <div>Pair: 1 to 1</div>
        </div>

        <h2 style={{ fontSize: '1.2rem', marginBottom: '10px', color: 'var(--neon-gold)' }}>Action Log</h2>
        <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {chatLog.map((log, i) => (
            <div key={i} style={{ color: log.includes('won') ? '#00ffcc' : 'white' }}>{log}</div>
          ))}
        </div>
      </div>

      {/* Center: The Table */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Game State Header */}
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{table.name}</h2>
            <div style={{ color: table.status === 'ANTE' ? '#00ffcc' : table.status === 'PLAY' ? '#ffcc00' : '#ff3366', fontWeight: 'bold' }}>
              {table.status === 'ANTE' ? 'PLACE YOUR ANTE' : table.status === 'PLAY' ? 'PLAY OR FOLD' : 'ROUND RESOLVED'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {table.status === 'ANTE' && amIHost && (
              <button className="btn-primary" onClick={handleDeal} disabled={isProcessing}>DEAL CARDS</button>
            )}
            {table.status === 'PLAY' && amIHost && (
              <button className="btn-primary" onClick={handleResolve} disabled={isProcessing}>RESOLVE ROUND</button>
            )}
            {table.status === 'RESOLVE' && amIHost && (
              <button className="btn-primary" onClick={handleNextRound} disabled={isProcessing}>NEXT ROUND</button>
            )}
          </div>
        </div>

        {/* The Felt */}
        <div className="glass-panel" style={{ flex: 1, background: 'linear-gradient(135deg, #1a237e 0%, #000051 100%)', border: '2px solid #3f51b5', borderRadius: '20px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '40px' }}>
          
          {/* Dealer Area */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', letterSpacing: '2px' }}>
              Dealer
            </div>
            <div style={{ display: 'flex', height: '100px' }}>
              {dealerHand.length > 0 ? (
                dealerHand.map((c, i) => renderCard(c, i, table.status === 'PLAY'))
              ) : (
                <div style={{ width: '70px', height: '100px', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '8px' }}></div>
              )}
            </div>
          </div>

          <div style={{ flex: 1, width: '100%', position: 'relative' }}>
             {/* Other players could be rendered here later */}
          </div>

          {/* Player Area */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
            
            {myState ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                <div style={{ display: 'flex', height: '100px' }}>
                  {myState.hand.map((c, i) => renderCard(c, i))}
                </div>
                {table.status !== 'ANTE' && myState.hand.length > 0 && (
                  <div style={{ background: 'var(--neon-gold)', color: '#000', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold' }}>
                    {evaluate3CardHand(myState.hand).name}
                  </div>
                )}
                
                {/* Active Player Actions */}
                {table.status === 'PLAY' && myState.status === 'WAITING' && (
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <button className="btn-secondary" onClick={handleFold} disabled={isProcessing} style={{ padding: '10px 30px', fontSize: '1.2rem', borderColor: '#ff3366', color: '#ff3366' }}>
                      FOLD
                    </button>
                    <button className="btn-primary" onClick={handlePlay} disabled={isProcessing} style={{ padding: '10px 30px', fontSize: '1.2rem', background: '#00cc66' }}>
                      PLAY (${myState.betAnte})
                    </button>
                  </div>
                )}
                {myState.status === 'FOLD' && <div style={{ color: '#ff3366', fontWeight: 'bold', fontSize: '1.5rem' }}>FOLDED</div>}
                {myState.status === 'PLAY' && <div style={{ color: '#00cc66', fontWeight: 'bold', fontSize: '1.5rem' }}>PLAYING</div>}
              </div>
            ) : (
              // Betting Area (if hasn't bet yet)
              table.status === 'ANTE' ? (
                <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
                  <div 
                    onClick={() => setAnteBet(a => a + selectedChip)}
                    style={{ border: '2px solid rgba(255,255,255,0.3)', borderRadius: '50%', width: '120px', height: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.05)' }}
                  >
                    <div style={{ color: '#fff', fontWeight: 'bold' }}>ANTE</div>
                    <div style={{ color: 'var(--neon-gold)', fontSize: '1.2rem' }}>${anteBet}</div>
                  </div>
                  
                  <div 
                    onClick={() => setPairPlusBet(p => p + selectedChip)}
                    style={{ border: '2px solid rgba(255,255,255,0.3)', borderRadius: '50%', width: '120px', height: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.05)' }}
                  >
                    <div style={{ color: '#fff', fontWeight: 'bold' }}>PAIR PLUS</div>
                    <div style={{ color: 'var(--neon-gold)', fontSize: '1.2rem' }}>${pairPlusBet}</div>
                  </div>

                  <button className="btn-primary" onClick={handlePlaceBets} disabled={isProcessing || anteBet === 0} style={{ height: '50px' }}>
                    CONFIRM BETS
                  </button>
                </div>
              ) : (
                <div style={{ opacity: 0.5 }}>Waiting for next round...</div>
              )
            )}
            
            {/* Display Locked Bets */}
            {myState && (
              <div style={{ display: 'flex', gap: '20px', opacity: 0.8 }}>
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px 20px', borderRadius: '10px' }}>
                  ANTE: <span style={{ color: 'var(--neon-gold)' }}>${myState.betAnte}</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px 20px', borderRadius: '10px' }}>
                  PAIR PLUS: <span style={{ color: 'var(--neon-gold)' }}>${myState.betPairPlus}</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px 20px', borderRadius: '10px' }}>
                  PLAY: <span style={{ color: 'var(--neon-gold)' }}>${myState.betPlay}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chip Selection */}
        {table.status === 'ANTE' && !myState && (
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
            <button className="btn-secondary" onClick={() => { setAnteBet(0); setPairPlusBet(0); }} style={{ marginLeft: '20px' }}>Clear</button>
          </div>
        )}

      </div>
    </div>
  )
}
