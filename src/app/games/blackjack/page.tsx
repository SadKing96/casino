'use client'

import { useUser } from '@/context/UserContext'
import { getBlackjackState, dealHand, hit, stand, chatWithDealer } from './actions'
import { Card, calculateScore, calculateScoreString } from './utils'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

export default function Blackjack() {
  const { user, updateBalances } = useUser()
  const [gameState, setGameState] = useState<any>(null)
  const [betAmount, setBetAmount] = useState(10)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Chat History State
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<{sender: string, text: string}[]>([
    { sender: 'Marty', text: "Place your bets, kid." }
  ])
  const [isTyping, setIsTyping] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // Chip History State
  const [chipHistory, setChipHistory] = useState<{amount: number, type: 'win'|'loss', id: number}[]>([])

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatHistory, isTyping])

  useEffect(() => {
    if (!user) return
    getBlackjackState().then(state => {
      if (state) setGameState(state)
    })
  }, [user])

  const handleAction = async (actionFn: () => Promise<any>) => {
    if (!user) return
    setIsProcessing(true)
    const oldBalance = user.chipBalance

    try {
      const result = await actionFn()
      setGameState(result.state)
      
      if (result.newBalance !== undefined) {
        const diff = result.newBalance - oldBalance
        if (diff !== 0) {
          setChipHistory(prev => [{ amount: diff, type: diff > 0 ? 'win' : 'loss', id: Date.now() }, ...prev].slice(0, 50))
        }
        updateBalances(result.newBalance, user.bankBalance)
      }
      if (result.dealerMsg) {
        setChatHistory(prev => [...prev, { sender: 'Marty', text: result.dealerMsg }])
      }
    } catch (e: any) {
      console.error(e)
      setChatHistory(prev => [...prev, { sender: 'Marty', text: e.message || "Can't do that." }])
    }
    setIsProcessing(false)
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatMessage.trim() || isTyping) return
    
    const msg = chatMessage
    setChatMessage('')
    setIsTyping(true)
    
    setChatHistory(prev => [...prev, { sender: user?.username || 'You', text: msg }])
    
    // Construct game context
    let context = `Status: ${gameState?.status}. `
    if (gameState && gameState.status !== 'BETTING') {
      const pHand = JSON.parse(gameState.playerHands)[0]
      const dHand = JSON.parse(gameState.dealerHand)
      context += `Player has ${calculateScore(pHand)}. Dealer shows ${dHand[0].rank} of ${dHand[0].suit}. `
    }

    const reply = await chatWithDealer(msg, context)
    setChatHistory(prev => [...prev, { sender: 'Marty', text: reply }])
    setIsTyping(false)
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <h2 style={{ marginBottom: '16px' }}>Please login to play</h2>
        <Link href="/" className="btn-primary">Return to Lobby</Link>
      </div>
    )
  }

  if (!gameState) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Loading table...</div>

  const isBetting = gameState.status === 'BETTING' || gameState.status === 'GAME_OVER'
  const isPlayerTurn = gameState.status === 'PLAYER_TURN'
  const playerHands = JSON.parse(gameState.playerHands || '[[]]')
  const dealerHand = JSON.parse(gameState.dealerHand || '[]')
  
  const pScoreStr = calculateScoreString(playerHands[0] || [])
  
  // Dealer score should only show visible cards unless game over
  const visibleDealerHand = gameState.status === 'GAME_OVER' ? dealerHand : dealerHand.filter((c: Card) => !c.hidden)
  const dScoreStr = calculateScoreString(visibleDealerHand)

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      minHeight: 'calc(100vh - 100px)', padding: '20px',
      background: 'radial-gradient(circle at 50% 50%, #006600 0%, #002200 100%)',
      position: 'relative', overflow: 'hidden'
    }}>
      
      {/* DEALER PIT (HALF MOON) */}
      <div style={{
        position: 'absolute', top: '-150px', left: '50%', transform: 'translateX(-50%)',
        width: '800px', height: '400px', background: 'radial-gradient(circle at 50% 0%, #111 0%, #000 100%)', 
        borderRadius: '0 0 400px 400px', boxShadow: '0 20px 50px rgba(0,0,0,0.9)', 
        zIndex: 5, borderBottom: '3px solid rgba(212, 175, 55, 0.3)'
      }} />

      {/* FELT GRAPHICS */}
      <div style={{ 
        position: 'absolute', top: '35%', width: '1200px', height: '600px', 
        borderRadius: '600px 600px 0 0', border: '3px solid rgba(212, 175, 55, 0.4)', 
        pointerEvents: 'none', display: 'flex', flexDirection: 'column', 
        alignItems: 'center', justifyContent: 'center' 
      }}>
        <h1 style={{ fontSize: '5rem', color: 'rgba(212, 175, 55, 0.1)', fontWeight: 'bold', margin: 0, marginTop: '-50px' }}>KINGZ CASINO</h1>
        <p style={{ color: 'rgba(212, 175, 55, 0.6)', fontSize: '1.5rem', fontWeight: 'bold', marginTop: '30px', letterSpacing: '3px' }}>BLACKJACK PAYS 3 TO 2</p>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '1rem', marginTop: '12px', letterSpacing: '1px' }}>Dealer must draw to 16 and stand on all 17s</p>
        <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '1rem', marginTop: '8px' }}>INSURANCE PAYS 2 TO 1</p>
      </div>

      {/* LEATHER RAIL */}
      <div style={{ 
        position: 'absolute', bottom: '-50px', left: '-10%', right: '-10%', height: '180px', 
        borderRadius: '50% 50% 0 0', background: 'linear-gradient(to bottom, #3a2000, #1a0b00)', 
        boxShadow: '0 -15px 30px rgba(0,0,0,0.8)', pointerEvents: 'none', zIndex: 5,
        borderTop: '5px solid #2a1500'
      }} />

      {/* CHAT WINDOW (TOP LEFT) */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', width: '320px', height: '400px', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.8)', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.5)', boxShadow: '0 10px 30px rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, transparent 100%)', borderBottom: '1px solid rgba(212, 175, 55, 0.3)', fontWeight: 'bold', color: '#d4af37' }}>
          TABLE CHAT
        </div>
        
        <div ref={chatScrollRef} style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {chatHistory.map((msg, i) => {
            const isDealer = msg.sender === 'Marty'
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isDealer ? 'flex-start' : 'flex-end' }}>
                <span style={{ fontSize: '0.8rem', color: isDealer ? '#d4af37' : '#aaa', marginBottom: '4px', fontWeight: 'bold' }}>{msg.sender}</span>
                <div style={{ background: isDealer ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255,255,255,0.1)', border: isDealer ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255,255,255,0.2)', padding: '8px 12px', borderRadius: '12px', color: '#fff', fontSize: '0.95rem', maxWidth: '85%' }}>
                  {msg.text}
                </div>
              </div>
            )
          })}
          {isTyping && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.8rem', color: '#d4af37', marginBottom: '4px', fontWeight: 'bold' }}>Marty</span>
              <div style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', padding: '8px 12px', borderRadius: '12px', color: '#fff', fontSize: '0.95rem' }}>
                <span className="typing-dots">...</span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleChatSubmit} style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '12px' }}>
          <input 
            type="text" value={chatMessage} onChange={e => setChatMessage(e.target.value)}
            placeholder="Type a message..."
            style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', outline: 'none', padding: '8px 12px' }}
            disabled={isTyping}
          />
          <button type="submit" style={{ background: 'linear-gradient(135deg, #f2a900 0%, #d48e00 100%)', color: '#000', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 'bold', cursor: isTyping ? 'not-allowed' : 'pointer', opacity: isTyping ? 0.5 : 1, marginLeft: '8px' }}>
            SEND
          </button>
        </form>
      </div>

      {/* CHIP WALLET & HISTORY (TOP RIGHT) */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', width: '220px', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.8)', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.5)', boxShadow: '0 10px 30px rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 10, overflow: 'hidden' }}>
        <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ color: '#d4af37', fontSize: '0.9rem', opacity: 0.9, letterSpacing: '2px', marginBottom: '8px', fontWeight: 'bold' }}>YOUR CHIPS</div>
          <div style={{ fontSize: '2rem', color: '#fff', textShadow: '0 0 10px rgba(212,175,55,0.5)', fontWeight: 'bold' }}>${user.chipBalance.toLocaleString()}</div>
        </div>
        
        <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <AnimatePresence>
            {chipHistory.length === 0 && (
              <div style={{ opacity: 0.5, textAlign: 'center', fontSize: '0.8rem', padding: '16px 0' }}>No recent activity.</div>
            )}
            {chipHistory.map(entry => (
              <motion.div 
                key={entry.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 'bold' }}
              >
                <span style={{ color: '#fff', opacity: 0.7 }}>Betting</span>
                <span style={{ color: entry.type === 'win' ? '#00ffaa' : '#ff3366' }}>
                  {entry.type === 'win' ? '+' : ''}{entry.amount}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* DEALER PORTRAIT */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px', position: 'relative', zIndex: 10, marginTop: '10px' }}>
        <div style={{
          width: '90px', height: '90px', borderRadius: '50%', border: '3px solid #d4af37',
          backgroundImage: 'url(/images/dealer_marty.png)', backgroundSize: 'cover', backgroundPosition: 'center 20%',
          boxShadow: '0 0 20px rgba(0,0,0,0.8)'
        }} />
        <div style={{ background: '#000', color: '#d4af37', padding: '2px 12px', borderRadius: '12px', marginTop: '-10px', fontWeight: 'bold', border: '1px solid #d4af37', fontSize: '0.8rem' }}>
          MARTY
        </div>
      </div>

      {/* DEALER CARDS */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '120px', zIndex: 10 }}>
        <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px', opacity: 0.8, fontSize: '0.9rem' }}>DEALER ({dScoreStr || '?'})</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {dealerHand.map((card: Card, i: number) => (
            <motion.div 
              key={i} initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              style={{
                width: '70px', height: '100px', borderRadius: '8px', background: card.hidden ? 'linear-gradient(135deg, #b30000 0%, #660000 100%)' : '#fff',
                border: '1px solid #000', boxShadow: '2px 5px 10px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', color: ['♥️','♦️'].includes(card.suit) ? '#d00' : '#000',
                borderWidth: card.hidden ? '3px' : '1px', borderColor: card.hidden ? '#fff' : '#000'
              }}
            >
              {!card.hidden && (
                <>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', alignSelf: 'flex-start', marginLeft: '6px' }}>{card.rank}</span>
                  <span style={{ fontSize: '2.5rem', marginTop: '-10px' }}>{card.suit}</span>
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* 5 PLAYER SEATS (CURVED) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '1400px', padding: '0 60px', marginTop: '10px', zIndex: 10, position: 'relative' }}>
        
        {/* SEAT 1 (Empty) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.6, marginTop: '0px' }}>
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px', fontSize: '0.8rem' }}>SEAT OPEN</div>
          <div style={{ width: '70px', height: '100px', border: '2px dashed rgba(255,255,255,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.5rem', opacity: 0.5 }}>🪑</span>
          </div>
          <div style={{ width: '80px', height: '90px', border: '2px solid rgba(212, 175, 55, 0.3)', borderRadius: '12px', marginTop: '10px', pointerEvents: 'none' }} />
        </div>

        {/* SEAT 2 (Empty) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.6, marginTop: '40px' }}>
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px', fontSize: '0.8rem' }}>SEAT OPEN</div>
          <div style={{ width: '70px', height: '100px', border: '2px dashed rgba(255,255,255,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.5rem', opacity: 0.5 }}>🪑</span>
          </div>
          <div style={{ width: '80px', height: '90px', border: '2px solid rgba(212, 175, 55, 0.3)', borderRadius: '12px', marginTop: '10px', pointerEvents: 'none' }} />
        </div>

        {/* SEAT 3 (Active Player) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '80px', position: 'relative' }}>
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px', opacity: 0.8, fontSize: '0.9rem' }}>PLAYER ({pScoreStr || '0'})</div>
          
          <div style={{ position: 'relative', minHeight: '100px', width: '70px' }}>
            {playerHands[0]?.length === 0 && (
              <div style={{ width: '70px', height: '100px', border: '2px dashed rgba(255,255,255,0.3)', borderRadius: '8px' }} />
            )}
            <div style={{ display: 'flex', gap: '8px', position: 'absolute', top: 0, left: playerHands[0]?.length > 1 ? `-${(playerHands[0].length - 1) * 20}px` : 0 }}>
              {playerHands[0]?.map((card: Card, i: number) => (
                <motion.div 
                  key={i} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  style={{
                    width: '70px', height: '100px', borderRadius: '8px', background: '#fff', border: '1px solid #000',
                    boxShadow: '2px 5px 10px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', color: ['♥️','♦️'].includes(card.suit) ? '#d00' : '#000',
                    position: 'relative', zIndex: i
                  }}
                >
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', alignSelf: 'flex-start', marginLeft: '6px' }}>{card.rank}</span>
                  <span style={{ fontSize: '2.5rem', marginTop: '-10px' }}>{card.suit}</span>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Betting Box */}
          <div style={{ width: '90px', height: '100px', border: '3px solid rgba(212, 175, 55, 0.6)', borderRadius: '16px', marginTop: '20px', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          </div>
        </div>

        {/* SEAT 4 (Empty) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.6, marginTop: '40px' }}>
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px', fontSize: '0.8rem' }}>SEAT OPEN</div>
          <div style={{ width: '70px', height: '100px', border: '2px dashed rgba(255,255,255,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.5rem', opacity: 0.5 }}>🪑</span>
          </div>
          <div style={{ width: '80px', height: '90px', border: '2px solid rgba(212, 175, 55, 0.3)', borderRadius: '12px', marginTop: '10px', pointerEvents: 'none' }} />
        </div>

        {/* SEAT 5 (Empty) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.6, marginTop: '0px' }}>
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px', fontSize: '0.8rem' }}>SEAT OPEN</div>
          <div style={{ width: '70px', height: '100px', border: '2px dashed rgba(255,255,255,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.5rem', opacity: 0.5 }}>🪑</span>
          </div>
          <div style={{ width: '80px', height: '90px', border: '2px solid rgba(212, 175, 55, 0.3)', borderRadius: '12px', marginTop: '10px', pointerEvents: 'none' }} />
        </div>

      </div>

      {/* CONTROLS */}
      <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '16px', zIndex: 10 }}>
        {isBetting ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(0,0,0,0.6)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.3)', backdropFilter: 'blur(5px)' }}>
            <div style={{ color: '#d4af37', fontWeight: 'bold' }}>BET:</div>
            {[10, 50, 100, 500].map(amt => (
              <button 
                key={amt} onClick={() => setBetAmount(amt)}
                style={{ 
                  width: '60px', height: '60px', borderRadius: '50%', background: betAmount === amt ? 'radial-gradient(circle, #ffcc00, #aa7700)' : 'radial-gradient(circle, #444, #111)',
                  border: '2px solid #fff', color: '#fff', fontWeight: 'bold', cursor: 'pointer', boxShadow: betAmount === amt ? '0 0 20px rgba(255,204,0,0.5)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                ${amt}
              </button>
            ))}
            <button className="btn-primary" style={{ marginLeft: '16px', padding: '16px 32px', fontSize: '1.2rem', boxShadow: '0 0 15px rgba(212,175,55,0.4)' }} onClick={() => handleAction(() => dealHand(betAmount))} disabled={isProcessing || user.chipBalance < betAmount}>
              DEAL
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '16px', background: 'rgba(0,0,0,0.6)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.3)', backdropFilter: 'blur(5px)' }}>
            <button className="btn-primary" style={{ background: '#0055ff', padding: '16px 32px', fontSize: '1.2rem', minWidth: '120px' }} onClick={() => handleAction(hit)} disabled={isProcessing || !isPlayerTurn}>
              HIT
            </button>
            <button className="btn-primary" style={{ background: '#ff5500', padding: '16px 32px', fontSize: '1.2rem', minWidth: '120px' }} onClick={() => handleAction(stand)} disabled={isProcessing || !isPlayerTurn}>
              STAND
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
