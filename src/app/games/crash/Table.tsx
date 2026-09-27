'use client'

import { useUser } from '@/context/UserContext'
import { getTableState, placeBet, startGame, cashOut, resolveGame, clearTable } from './actions'
import { CrashBet, calculateMultiplier, calculateTimeMsForMultiplier } from './utils'
import { useState, useEffect, useRef } from 'react'

export default function CrashTableUI({ tableId, onLeave }: { tableId: string, onLeave: () => void }) {
  const { user, updateBalances } = useUser()
  const [table, setTable] = useState<any>(null)
  const [selectedChip, setSelectedChip] = useState<number>(10)
  const [betAmount, setBetAmount] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [chatLog, setChatLog] = useState<string[]>([])
  
  // Animation state
  const [displayMult, setDisplayMult] = useState(1.00)
  const [isLocalCrashed, setIsLocalCrashed] = useState(false)
  const animFrame = useRef<number>(0)

  useEffect(() => {
    loadTable()
    const interval = setInterval(loadTable, 1000)
    return () => clearInterval(interval)
  }, [])

  // The animation loop
  useEffect(() => {
    if (table?.status === 'IN_FLIGHT' && table.startTime && !isLocalCrashed) {
      const startMs = new Date(table.startTime).getTime()
      const explodeMs = startMs + calculateTimeMsForMultiplier(table.crashPoint)

      const animate = () => {
        const now = Date.now()
        if (now < startMs) {
          // Pre-flight delay
          setDisplayMult(1.00)
          animFrame.current = requestAnimationFrame(animate)
        } else if (now >= explodeMs) {
          // BOOM
          setDisplayMult(table.crashPoint)
          setIsLocalCrashed(true)
          if (amIHost) {
            resolveGame(tableId).then(loadTable).catch(() => {})
          }
        } else {
          // Flying
          setDisplayMult(calculateMultiplier(startMs, now))
          animFrame.current = requestAnimationFrame(animate)
        }
      }
      animFrame.current = requestAnimationFrame(animate)
    } else if (table?.status === 'CRASHED') {
      setDisplayMult(table.crashPoint)
      setIsLocalCrashed(true)
    } else if (table?.status === 'BETTING') {
      setDisplayMult(1.00)
      setIsLocalCrashed(false)
    }

    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current)
    }
  }, [table?.status, table?.startTime, table?.crashPoint, isLocalCrashed])

  const loadTable = async () => {
    const state = await getTableState(tableId)
    setTable(state)
    if (state?.chatHistory) {
      setChatLog(JSON.parse(state.chatHistory))
    }
  }

  const handlePlaceBet = async () => {
    if (!user || isProcessing || table?.status !== 'BETTING' || betAmount === 0) return
    setIsProcessing(true)
    try {
      await placeBet(tableId, betAmount)
      updateBalances(user.chipBalance - betAmount, user.bankBalance)
      await loadTable()
    } catch (e: any) {
      alert(e.message)
    }
    setIsProcessing(false)
  }

  const handleStart = async () => {
    if (isProcessing) return
    setIsProcessing(true)
    try {
      await startGame(tableId)
      await loadTable()
    } catch (e: any) {
      alert(e.message)
    }
    setIsProcessing(false)
  }

  const handleCashOut = async () => {
    if (isProcessing || isLocalCrashed) return
    setIsProcessing(true)
    try {
      const res = await cashOut(tableId)
      const freshUser = await (await import('@/app/actions')).getUser()
      if (freshUser) {
        updateBalances(freshUser.chipBalance, freshUser.bankBalance)
      }
    } catch (e: any) {
      alert(e.message)
    }
    setIsProcessing(false)
    await loadTable()
  }

  const handleNextRound = async () => {
    if (isProcessing) return
    setIsProcessing(true)
    try {
      await clearTable(tableId)
      setBetAmount(0)
      await loadTable()
    } catch (e: any) {
      alert(e.message)
    }
    setIsProcessing(false)
  }

  if (!table || !user) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Table...</div>

  const activeBets: Record<string, CrashBet> = JSON.parse(table.activeBets)
  const myBet = activeBets[user.id]
  const amIHost = true

  return (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, 
      background: 'linear-gradient(to bottom, #000a1f, #000)', 
      display: 'flex', flexDirection: 'column',
      fontFamily: 'sans-serif'
    }}>
      
      {/* Leave Game Button floating */}
      <button 
        onClick={onLeave} 
        style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1010, background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid #555', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}
      >
        Exit Game
      </button>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, padding: '40px', gap: '20px' }}>
      
      {/* Left: Chat & Rules */}
      <div className="glass-panel" style={{ width: '300px', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '10px', color: 'var(--neon-gold)' }}>Live Bets</h2>
        <div style={{ fontSize: '0.85rem', marginBottom: '20px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', flex: 1, overflowY: 'auto' }}>
          {Object.values(activeBets).length === 0 ? <div style={{ opacity: 0.5 }}>No bets yet.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.values(activeBets).map((bet, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: bet.cashedOut ? '#00ffcc' : '#fff' }}>
                  <span>User {bet.userId.substring(0, 4)}</span>
                  <span>
                    ${bet.amount} 
                    {bet.cashedOut && ` → ${bet.cashOutMultiplier.toFixed(2)}x`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <h2 style={{ fontSize: '1.2rem', marginBottom: '10px', color: 'var(--neon-gold)' }}>Action Log</h2>
        <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {chatLog.map((log, i) => (
            <div key={i} style={{ color: log.includes('won') || log.includes('cashed out') ? '#00ffcc' : log.includes('CRASHED') ? '#ff3366' : 'white' }}>{log}</div>
          ))}
        </div>
      </div>

      {/* Center: The Graph & Controls */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Crash Lounge #{table.id.slice(-4)}</h2>
            <div style={{ color: table.status === 'BETTING' ? '#00ffcc' : table.status === 'IN_FLIGHT' ? '#ffcc00' : '#ff3366', fontWeight: 'bold' }}>
              {table.status === 'BETTING' ? 'PLACE YOUR BETS' : table.status === 'IN_FLIGHT' ? 'IN FLIGHT' : 'CRASHED'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {table.status === 'BETTING' && amIHost && (
              <button className="btn-primary" onClick={handleStart} disabled={isProcessing}>LAUNCH 🚀</button>
            )}
            {table.status === 'CRASHED' && amIHost && (
              <button className="btn-primary" onClick={handleNextRound} disabled={isProcessing}>NEXT ROUND</button>
            )}
          </div>
        </div>

        {/* The Crash Graph */}
        <div className="glass-panel" style={{ 
          flex: 1, background: '#0a0a1a', border: '2px solid #3f51b5', borderRadius: '20px', 
          position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', overflow: 'hidden' 
        }}>
          {table.status === 'BETTING' && (
            <div style={{ fontSize: '3rem', color: '#ffcc00', opacity: 0.5, animation: 'pulse 2s infinite' }}>
              WAITING FOR LAUNCH
            </div>
          )}

          {table.status !== 'BETTING' && (
            <>
              {/* Dynamic Graph Background Effect */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: `${Math.min(100, (displayMult - 1) * 10)}%`,
                background: isLocalCrashed ? 'linear-gradient(to top, rgba(255, 51, 102, 0.2), transparent)' : 'linear-gradient(to top, rgba(0, 229, 255, 0.2), transparent)',
                transition: 'height 50ms linear'
              }} />

              {/* The Multiplier */}
              <div style={{ 
                fontSize: '8rem', fontWeight: '900', 
                color: isLocalCrashed ? '#ff3366' : '#00e5ff',
                textShadow: isLocalCrashed ? '0 0 40px rgba(255,51,102,0.8)' : '0 0 40px rgba(0,229,255,0.8)',
                zIndex: 10,
                transform: isLocalCrashed ? 'scale(1.1)' : 'scale(1)',
                transition: isLocalCrashed ? 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none'
              }}>
                {displayMult.toFixed(2)}x
              </div>

              {/* The Rocket Emoji */}
              {!isLocalCrashed && table.status === 'IN_FLIGHT' && (
                <div style={{ fontSize: '4rem', position: 'absolute', bottom: `${Math.min(80, (displayMult - 1) * 10)}%`, right: `${Math.max(10, 50 - (displayMult - 1) * 5)}%`, transition: 'all 50ms linear' }}>
                  🚀
                </div>
              )}
              
              {isLocalCrashed && (
                <div style={{ fontSize: '5rem', position: 'absolute', zIndex: 11 }}>
                  💥
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="glass-panel" style={{ padding: '30px', display: 'flex', gap: '40px', justifyContent: 'center', alignItems: 'center' }}>
          
          {table.status === 'BETTING' ? (
            <>
              {myBet ? (
                <div style={{ fontSize: '1.5rem', color: '#00ffcc', fontWeight: 'bold' }}>
                  Bet Placed: ${myBet.amount}. Waiting for launch...
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    {[10, 50, 100, 500, 1000].map(amount => (
                      <div 
                        key={amount}
                        onClick={() => setSelectedChip(amount)}
                        style={{
                          width: '50px', height: '50px', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 'bold', cursor: 'pointer',
                          background: selectedChip === amount ? 'radial-gradient(circle, #00e5ff 0%, #0088aa 100%)' : 'radial-gradient(circle, #444 0%, #222 100%)',
                          color: selectedChip === amount ? '#000' : '#fff',
                          border: `2px dashed ${selectedChip === amount ? '#fff' : '#666'}`,
                          transform: selectedChip === amount ? 'scale(1.1)' : 'scale(1)',
                        }}
                      >
                        ${amount}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div onClick={() => setBetAmount(a => a + selectedChip)} style={{ border: '2px solid rgba(255,255,255,0.3)', borderRadius: '12px', padding: '15px 30px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)' }}>
                      <div style={{ color: '#fff', fontSize: '0.9rem' }}>CURRENT BET</div>
                      <div style={{ color: '#00e5ff', fontSize: '1.5rem', fontWeight: 'bold' }}>${betAmount}</div>
                    </div>
                    
                    <button className="btn-primary" onClick={handlePlaceBet} disabled={isProcessing || betAmount === 0} style={{ padding: '20px 40px', fontSize: '1.2rem', background: '#00e5ff', color: '#000' }}>
                      PLACE BET
                    </button>
                    <button className="btn-secondary" onClick={() => setBetAmount(0)}>Clear</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            // In Flight Controls
            <div style={{ width: '100%', maxWidth: '600px' }}>
              {myBet ? (
                myBet.cashedOut ? (
                  <div style={{ textAlign: 'center', fontSize: '2rem', color: '#00ffcc', fontWeight: 'bold' }}>
                    Cashed Out at {myBet.cashOutMultiplier.toFixed(2)}x!<br/>
                    <span style={{ fontSize: '1.2rem', color: '#fff' }}>Profit: ${myBet.profit}</span>
                  </div>
                ) : (
                  <button 
                    className="btn-primary" 
                    onClick={handleCashOut}
                    disabled={isProcessing || isLocalCrashed}
                    style={{ width: '100%', height: '80px', fontSize: '2rem', background: isLocalCrashed ? '#333' : '#00cc66', color: isLocalCrashed ? '#666' : '#fff', borderRadius: '20px' }}
                  >
                    {isLocalCrashed ? 'CRASHED' : `CASH OUT ($${Math.floor(myBet.amount * displayMult)})`}
                  </button>
                )
              ) : (
                <div style={{ textAlign: 'center', fontSize: '1.5rem', color: '#aaa' }}>
                  You are spectating this round.
                </div>
              )}
            </div>
          )}
        </div>

      </div>
      </div>
    </div>
  )
}
