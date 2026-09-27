import { useUser } from '@/context/UserContext'
import { getTableState, placeBet, rollDice } from './actions'
import { CrapsBet, CrapsBetType } from './utils'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { io } from 'socket.io-client'

export default function CrapsTable({ tableId, onLeave }: { tableId: string, onLeave: () => void }) {
  const { user, updateBalances } = useUser()
  const [gameState, setGameState] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedChip, setSelectedChip] = useState<number>(5)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [rollingDice, setRollingDice] = useState<boolean>(false)

  const fetchState = () => {
    getTableState(tableId).then(state => {
      if (state) setGameState(state)
    }).catch(e => setErrorMsg(e.message || String(e)))
  }

  // Socket setup
  useEffect(() => {
    if (!user) return
    fetchState()
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001')
    socket.on('connect', () => socket.emit('join_table', tableId))
    socket.on('update_required', () => fetchState())
    return () => {
      socket.emit('leave_table', tableId)
      socket.disconnect()
    }
  }, [user, tableId])

  const notifyOthers = async () => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001')
    socket.emit('action_taken', tableId)
    socket.disconnect()
  }

  const handlePlaceBet = async (type: CrapsBetType) => {
    if (!user || isProcessing || rollingDice) return
    setIsProcessing(true)
    const oldBalance = user.chipBalance
    try {
      const result = await placeBet(tableId, type, selectedChip)
      setGameState(result)
      updateBalances(oldBalance - selectedChip, user.bankBalance)
      await notifyOthers()
    } catch (e: any) {
      console.error(e)
    }
    setIsProcessing(false)
  }

  const handleRollDice = async () => {
    if (!user || isProcessing) return
    setIsProcessing(true)
    setRollingDice(true)
    
    // Simulate dice roll animation time
    setTimeout(async () => {
      try {
        const result = await rollDice(tableId)
        setGameState(result)
        // We need to fetch our new balance because we might have won
        const res = await fetch('/api/auth/me') // Assuming we have an endpoint, or just force a page reload if needed
        // For simplicity, we just rely on Context or let the user refresh to see exact winnings if we don't have a direct return of balance.
        // Actually, user chip balance is updated in DB. Next time they place a bet it syncs, but let's just trigger a small delay then they can refresh if they want.
        await notifyOthers()
      } catch (e: any) {
        console.error(e)
      }
      setRollingDice(false)
      setIsProcessing(false)
    }, 1500)
  }

  if (errorMsg) return <div style={{ textAlign: 'center', marginTop: '100px', color: 'red' }}>Error: {errorMsg}</div>
  if (!gameState) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Loading table...</div>

  const status = gameState.status
  const point = gameState.point
  const activeBets: CrapsBet[] = JSON.parse(gameState.activeBets || '[]')
  const dice: number[] = JSON.parse(gameState.dice || '[3,4]')

  // Helper to render chips on a betting area
  const renderChips = (type: CrapsBetType) => {
    const bets = activeBets.filter(b => b.type === type)
    if (bets.length === 0) return null

    // Group by user
    const userBets: Record<string, { username: string, total: number }> = {}
    bets.forEach(b => {
      if (!userBets[b.userId]) userBets[b.userId] = { username: b.username, total: 0 }
      userBets[b.userId].total += b.amount
    })

    return (
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
        {Object.entries(userBets).map(([uid, data]) => {
          const isMe = uid === user?.id
          return (
            <div key={uid} style={{ 
              width: '30px', height: '30px', borderRadius: '50%', 
              background: isMe ? 'radial-gradient(circle, #f2a900 0%, #d48e00 100%)' : 'radial-gradient(circle, #fff 0%, #ccc 100%)',
              border: `2px dashed ${isMe ? '#fff' : '#000'}`, color: isMe ? '#000' : '#000',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold',
              boxShadow: '0 4px 6px rgba(0,0,0,0.5)'
            }}>
              {data.total}
            </div>
          )
        })}
      </div>
    )
  }

  const BetArea = ({ type, label, flex, height, bg, color, border, extraStyle }: any) => (
    <div 
      onClick={() => handlePlaceBet(type)}
      style={{
        flex, height, background: bg || 'rgba(0,100,0,0.6)', 
        border: border || '2px solid #fff', color: color || '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem',
        textTransform: 'uppercase', transition: 'all 0.2s', ...extraStyle
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,150,0,0.8)'}
      onMouseLeave={e => e.currentTarget.style.background = bg || 'rgba(0,100,0,0.6)'}
    >
      <div style={{ position: 'relative', zIndex: 2 }}>{label}</div>
      {renderChips(type)}
    </div>
  )

  const chatHistory = JSON.parse(gameState.chatHistory || '[]')

  return (
    <div style={{ 
      display: 'flex', width: '100%', height: 'calc(100vh - 120px)', padding: '10px 20px', gap: '20px',
      background: 'radial-gradient(circle at 50% 50%, #004400 0%, #001100 100%)', overflow: 'hidden' 
    }}>
      
      {/* LEFT SIDE: GAME BOARD */}
      <div style={{ flex: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
        {/* TOP FLOATING ELEMENTS */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', flexShrink: 0 }}>
          
          {/* Left Container */}
          <button onClick={onLeave} className="btn-secondary" style={{ padding: '6px 16px', borderRadius: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}>
            ← Leave Table
          </button>
          
          {/* Center Container */}
          <div style={{ background: 'rgba(0,0,0,0.6)', padding: '4px 20px', borderRadius: '20px', border: '1px solid rgba(212,175,55,0.4)', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
            <h2 style={{ color: '#d4af37', margin: 0, fontSize: '1rem', letterSpacing: '2px', textTransform: 'uppercase' }}>{gameState.name}</h2>
          </div>

          {/* Right Container (Puck) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
            <span style={{ fontSize: '0.7rem', color: '#ccc', textTransform: 'uppercase', marginLeft: '6px' }}>Point</span>
            <div style={{ 
              width: '30px', height: '30px', borderRadius: '50%', 
              background: status === 'ON' ? 'radial-gradient(circle, #fff 0%, #ddd 100%)' : 'radial-gradient(circle, #222 0%, #000 100%)',
              border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: status === 'ON' ? '#000' : '#fff', fontWeight: 'bold', fontSize: '0.8rem', boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
            }}>
              {status}
            </div>
            {status === 'ON' && <div style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 'bold', marginRight: '5px' }}>{point}</div>}
          </div>
        </div>

        {/* DICE DISPLAY */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '5px', height: '40px', flexShrink: 0 }}>
          <AnimatePresence mode="wait">
            {rollingDice ? (
              <motion.div key="rolling" initial={{ rotate: 0 }} animate={{ rotate: 360, y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 0.3 }} style={{ fontSize: '2rem' }}>
                🎲🎲
              </motion.div>
            ) : (
              <motion.div key="result" initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ display: 'flex', gap: '10px' }}>
                {[dice[0], dice[1]].map((d, i) => (
                  <div key={i} style={{ 
                    width: '35px', height: '35px', background: '#e62e00', borderRadius: '8px', border: '2px solid #fff',
                    boxShadow: 'inset 0 0 5px rgba(0,0,0,0.5), 0 2px 5px rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold'
                  }}>
                    {d}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CRAPS MAT */}
        <div style={{ 
          width: '100%', flex: 1, minHeight: 0, 
          border: '6px solid #5c3a21', borderRadius: '20px', background: '#006600', 
          padding: '10px', display: 'flex', gap: '10px', 
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8), 0 10px 30px rgba(0,0,0,0.8)',
          marginBottom: '5px'
        }}>
          
          {/* LEFT SIDE: Main Bets */}
          <div style={{ flex: 2.5, display: 'flex', flexDirection: 'column', border: '3px solid #fff' }}>
            
            {/* PLACE BETS */}
            <div style={{ display: 'flex', flex: 1.5, borderBottom: '3px solid #fff' }}>
              {[4, 5, 'SIX', 8, 'NINE', 10].map((num, i) => {
                const type = `PLACE_${typeof num === 'string' ? (num === 'SIX' ? 6 : 9) : num}`
                return (
                  <BetArea key={num} type={type} label={num} flex={1} border="1px solid #fff" extraStyle={{ fontSize: 'clamp(14px, 2vh, 30px)', fontFamily: 'serif' }} />
                )
              })}
            </div>

            {/* COME */}
            <BetArea type="COME" label="C O M E" flex={1.5} borderBottom="3px solid #fff" extraStyle={{ fontSize: 'clamp(20px, 3vh, 40px)', color: '#ff3333', textShadow: '1px 1px 0 #fff', letterSpacing: '1vw' }} />

            {/* FIELD */}
            <BetArea type="FIELD" flex={2} borderBottom="3px solid #fff" label={
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: 'clamp(18px, 2.5vh, 35px)', letterSpacing: '5px' }}>FIELD</span>
                <span style={{ fontSize: 'clamp(10px, 1.2vh, 18px)', wordSpacing: '0.5vw' }}>2 • 3 • 4 • 9 • 10 • 11 • 12</span>
              </div>
            } />

            {/* DON't PASS / PASS LINE */}
            <div style={{ display: 'flex', flex: 1.5 }}>
              <BetArea type="DONT_PASS" label="DON'T PASS BAR" flex={1} borderRight="3px solid #fff" extraStyle={{ writingMode: 'vertical-rl', textOrientation: 'mixed', fontSize: 'clamp(10px, 1.2vh, 18px)' }} />
              <BetArea type="PASS_LINE" label="PASS LINE" flex={6} extraStyle={{ fontSize: 'clamp(16px, 2.5vh, 35px)', letterSpacing: '5px' }} />
            </div>
          </div>

          {/* RIGHT SIDE: Prop Bets */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '3px solid #fff' }}>
            
            {/* HARDWAYS */}
            <div style={{ display: 'flex', flexWrap: 'wrap', flex: 3, borderBottom: '3px solid #fff' }}>
              <BetArea type="HARD_4" label={<div style={{textAlign:'center', fontSize:'clamp(10px, 1.2vh, 18px)'}}>Hard 4<br/>7:1</div>} flex="1 0 50%" border="1px solid #fff" />
              <BetArea type="HARD_10" label={<div style={{textAlign:'center', fontSize:'clamp(10px, 1.2vh, 18px)'}}>Hard 10<br/>7:1</div>} flex="1 0 50%" border="1px solid #fff" />
              <BetArea type="HARD_6" label={<div style={{textAlign:'center', fontSize:'clamp(10px, 1.2vh, 18px)'}}>Hard 6<br/>9:1</div>} flex="1 0 50%" border="1px solid #fff" />
              <BetArea type="HARD_8" label={<div style={{textAlign:'center', fontSize:'clamp(10px, 1.2vh, 18px)'}}>Hard 8<br/>9:1</div>} flex="1 0 50%" border="1px solid #fff" />
            </div>

            {/* ANY SEVEN / CRAPS */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 2 }}>
              <BetArea type="ANY_SEVEN" label="ANY SEVEN (4:1)" flex={1} borderBottom="3px solid #fff" extraStyle={{ color: '#ff3333', fontSize: 'clamp(12px, 1.5vh, 22px)' }} />
              <BetArea type="ANY_CRAPS" label="ANY CRAPS (7:1)" flex={1} extraStyle={{ fontSize: 'clamp(12px, 1.5vh, 22px)' }} />
            </div>
          </div>

        </div>

        {/* CONTROLS */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          
          {/* CHIP SELECTOR */}
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.6)', padding: '8px 16px', borderRadius: '30px', border: '2px solid rgba(255,255,255,0.2)' }}>
            {[1, 5, 25, 100].map(val => (
              <div 
                key={val} onClick={() => setSelectedChip(val)}
                style={{
                  width: '50px', height: '50px', borderRadius: '50%', cursor: 'pointer',
                  background: val === 1 ? '#fff' : val === 5 ? '#ff3333' : val === 25 ? '#00cc66' : '#222',
                  color: val === 1 ? '#000' : '#fff', border: `4px dashed ${selectedChip === val ? '#ffcc00' : (val === 1 ? '#ccc' : '#fff')}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 'bold',
                  transform: selectedChip === val ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                }}
              >
                ${val}
              </div>
            ))}
          </div>

          {/* ROLL BUTTON */}
          <button 
            onClick={handleRollDice} 
            disabled={isProcessing || rollingDice}
            style={{ 
              background: 'linear-gradient(135deg, #f2a900 0%, #d48e00 100%)', color: '#000', 
              border: 'none', borderRadius: '30px', padding: '12px 40px', fontSize: '1.5rem', fontWeight: 'bold', 
              cursor: (isProcessing || rollingDice) ? 'not-allowed' : 'pointer', opacity: (isProcessing || rollingDice) ? 0.5 : 1,
              boxShadow: '0 10px 20px rgba(0,0,0,0.5)', textTransform: 'uppercase'
            }}
          >
            {rollingDice ? 'Rolling...' : 'ROLL DICE'}
          </button>
        </div>
      </div>

      {/* RIGHT SIDE: HISTORY LOG */}
      <div style={{ 
        flex: 1, minWidth: '250px', maxWidth: '300px', background: 'rgba(0,0,0,0.7)', 
        borderRadius: '20px', border: '2px solid rgba(212,175,55,0.3)', padding: '15px', 
        display: 'flex', flexDirection: 'column', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
      }}>
        <h3 style={{ color: '#d4af37', marginTop: 0, textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1rem' }}>
          Action Log
        </h3>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
          {chatHistory.slice().reverse().map((msg: any, i: number) => (
            <div key={i} style={{ fontSize: '0.85rem', color: '#fff', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px', borderLeft: `3px solid ${msg.sender === 'Stickman' ? '#ff3333' : '#00cc66'}` }}>
              <strong style={{ color: msg.sender === 'Stickman' ? '#ffcc00' : '#00ffcc', display: 'block', marginBottom: '2px', fontSize: '0.75rem', textTransform: 'uppercase' }}>{msg.sender}</strong>
              {msg.text}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
