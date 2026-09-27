import { useUser } from '@/context/UserContext'
import { getTableState, dealHand, playerAction, chatWithDealer } from './actions'
import { Card, PlayerState, evaluateBestHand } from './utils'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { io } from 'socket.io-client'

export default function HoldemTable({ tableId, onLeave }: { tableId: string, onLeave: () => void }) {
  const { user, updateBalances } = useUser()
  const [gameState, setGameState] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [raiseAmount, setRaiseAmount] = useState(50)
  
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<{sender: string, text: string}[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  const [chipHistory, setChipHistory] = useState<{amount: number, type: 'win'|'loss', id: number}[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchState = () => {
    getTableState(tableId).then(state => {
      if (state) {
        setGameState(state)
        setChatHistory(JSON.parse(state.chatHistory || '[]'))
      }
    }).catch(e => setErrorMsg(e.message || String(e)))
  }

  // Socket setup
  useEffect(() => {
    if (!user) return
    fetchState()

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001')
    
    socket.on('connect', () => {
      socket.emit('join_table', tableId)
    })

    socket.on('update_required', () => {
      fetchState() // Someone else made a move, refetch!
    })

    return () => {
      socket.emit('leave_table', tableId)
      socket.disconnect()
    }
  }, [user, tableId])

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatHistory, isTyping])

  const notifyOthers = async () => {
    // Notify the socket server that we made a move
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001')
    socket.emit('action_taken', tableId)
    socket.disconnect() // Single-shot emission
  }

  const handleAction = async (actionFn: () => Promise<any>) => {
    if (!user) return
    setIsProcessing(true)
    const oldBalance = user.chipBalance

    try {
      const result = await actionFn()
      setGameState(result.state)
      await notifyOthers() // Trigger broadcast
      
      if (result.newBalance !== undefined) {
        const diff = result.newBalance - oldBalance
        if (diff !== 0) {
          setChipHistory(prev => [{ amount: diff, type: diff > 0 ? 'win' : 'loss', id: Date.now() }, ...prev].slice(0, 50))
        }
        updateBalances(result.newBalance, user.bankBalance)
      }
    } catch (e: any) {
      console.error(e)
      setChatHistory(prev => [...prev, { sender: 'Rusty', text: e.message || "Can't do that." }])
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
    
    let context = `Status: ${gameState?.status}. Pot: ${gameState?.potAmount}. `

    const reply = await chatWithDealer(msg, context)
    setChatHistory(prev => [...prev, { sender: 'Rusty', text: reply }])
    setIsTyping(false)
  }

  if (errorMsg) return <div style={{ textAlign: 'center', marginTop: '100px', color: 'red' }}>Error: {errorMsg}</div>
  if (!gameState) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Loading table...</div>

  const status = gameState.status
  const isLobby = status === 'LOBBY' || status === 'GAME_OVER'
  const players: PlayerState[] = JSON.parse(gameState.players || '[]')
  const board: Card[] = JSON.parse(gameState.communityCards || '[]')
  
  const humanPlayer = players.find(p => p.id === user?.id)
  const isPlayerTurn = !isLobby && gameState.currentTurnIndex === players.indexOf(humanPlayer!) && humanPlayer?.status === 'ACTIVE'

  let visibleBoard: Card[] = []
  if (status === 'FLOP') visibleBoard = board.slice(0, 3)
  else if (status === 'TURN') visibleBoard = board.slice(0, 4)
  else if (status === 'RIVER' || status === 'SHOWDOWN' || status === 'GAME_OVER') visibleBoard = board.slice(0, 5)

  let displayPlayers = [...players]
  const myIndex = displayPlayers.findIndex(p => p.id === user?.id)
  if (myIndex !== -1) {
    const shift = (2 - myIndex + 5) % 5
    displayPlayers = [...displayPlayers.slice(5 - shift), ...displayPlayers.slice(0, 5 - shift)]
  }

  // Layout slots up to 5
  const seatLayout = [displayPlayers[0], displayPlayers[1], displayPlayers[2], displayPlayers[3], displayPlayers[4]]

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      minHeight: 'calc(100vh - 100px)', padding: '20px',
      background: 'radial-gradient(circle at 50% 50%, #004400 0%, #001100 100%)',
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
        <p style={{ color: 'rgba(212, 175, 55, 0.6)', fontSize: '1.5rem', fontWeight: 'bold', marginTop: '30px', letterSpacing: '3px' }}>TEXAS HOLD'EM</p>
      </div>

      {/* LEATHER RAIL */}
      <div style={{ 
        position: 'absolute', bottom: '-50px', left: '-10%', right: '-10%', height: '180px', 
        borderRadius: '50% 50% 0 0', background: 'linear-gradient(to bottom, #3a2000, #1a0b00)', 
        boxShadow: '0 -15px 30px rgba(0,0,0,0.8)', pointerEvents: 'none', zIndex: 5,
        borderTop: '5px solid #2a1500'
      }} />

      <button onClick={onLeave} className="btn-primary" style={{ position: 'absolute', top: 20, left: 360, zIndex: 50 }}>Back to Lobby</button>

      {/* CHAT WINDOW (LEFT SIDE) */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', width: '320px', bottom: '20px', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.8)', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.5)', boxShadow: '0 10px 30px rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 5, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, transparent 100%)', borderBottom: '1px solid rgba(212, 175, 55, 0.3)', fontWeight: 'bold', color: '#d4af37' }}>
          TABLE CHAT
        </div>
        
        <div ref={chatScrollRef} style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {chatHistory.map((msg, i) => {
            const isDealer = msg.sender === 'Rusty'
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
              <span style={{ fontSize: '0.8rem', color: '#d4af37', marginBottom: '4px', fontWeight: 'bold' }}>Rusty</span>
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
          <div style={{ fontSize: '2rem', color: '#fff', textShadow: '0 0 10px rgba(212,175,55,0.5)', fontWeight: 'bold' }}>${user?.chipBalance.toLocaleString()}</div>
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
          backgroundImage: 'url(/images/dealer_rusty.png)', backgroundSize: 'cover', backgroundPosition: 'center 20%',
          boxShadow: '0 0 20px rgba(0,0,0,0.8)'
        }} />
        <div style={{ background: '#000', color: '#d4af37', padding: '2px 12px', borderRadius: '12px', marginTop: '-10px', fontWeight: 'bold', border: '1px solid #d4af37', fontSize: '0.8rem' }}>
          RUSTY
        </div>
      </div>

      {/* COMMUNITY CARDS & POT */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '120px', zIndex: 10 }}>
        <div style={{ color: '#d4af37', fontWeight: 'bold', marginBottom: '4px', fontSize: '1.2rem', textShadow: '0 0 10px rgba(212,175,55,0.5)' }}>
          POT: ${gameState.potAmount || 0}
        </div>
        <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px', opacity: 0.8, fontSize: '0.8rem' }}>{status}</div>
        
        <div style={{ display: 'flex', gap: '10px', minHeight: '100px', minWidth: '400px', justifyContent: 'center' }}>
          {visibleBoard.map((card: Card, i: number) => (
            <motion.div 
              key={i} initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              style={{
                width: '70px', height: '100px', borderRadius: '8px', background: '#fff',
                border: '1px solid #000', boxShadow: '2px 5px 10px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', color: ['♥️','♦️'].includes(card.suit) ? '#d00' : '#000'
              }}
            >
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', alignSelf: 'flex-start', marginLeft: '6px' }}>{card.rank}</span>
              <span style={{ fontSize: '2.5rem', marginTop: '-10px' }}>{card.suit}</span>
            </motion.div>
          ))}
          {[...Array(Math.max(0, 5 - visibleBoard.length))].map((_, i) => (
             <div key={`p-${i}`} style={{ width: '70px', height: '100px', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '8px' }} />
          ))}
        </div>
      </div>

      {/* 5 PLAYER SEATS (CURVED) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '1400px', padding: '0 60px', marginTop: '10px', zIndex: 10, position: 'relative' }}>
        
        {seatLayout.map((player, index) => {
          if (!player) return (
            <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5, marginTop: `${[0, 40, 80, 40, 0][index]}px` }}>
              <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px', fontSize: '0.8rem' }}>SEAT OPEN</div>
              <div style={{ width: '70px', height: '100px', border: '2px dashed rgba(255,255,255,0.3)', borderRadius: '8px' }} />
            </div>
          )
          
          const isMe = player.id === user?.id
          const isMyTurn = gameState.currentTurnIndex === index
          const marginTop = [0, 40, 80, 40, 0][index] // Curve

          return (
            <div key={player.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: player.status === 'OUT' ? 0.3 : 1, marginTop: `${marginTop}px`, position: 'relative' }}>
              
              {/* Turn indicator */}
              {isMyTurn && !isLobby && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ position: 'absolute', top: '-40px', background: '#ffcc00', color: '#000', padding: '4px 12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.8rem', boxShadow: '0 0 10px #ffcc00', zIndex: 20 }}
                >
                  THINKING...
                </motion.div>
              )}

              {/* Dealer Button */}
              {gameState.dealerButtonIndex === index && (
                <div style={{ position: 'absolute', left: '-30px', top: '10px', width: '30px', height: '30px', background: '#fff', borderRadius: '50%', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '2px solid #000', boxShadow: '0 2px 5px rgba(0,0,0,0.5)', fontSize: '0.8rem' }}>
                  D
                </div>
              )}

              <div style={{ color: isMe ? '#ffcc00' : '#fff', fontWeight: 'bold', marginBottom: '2px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {player.name} {isMe && '(You)'} {player.status === 'FOLDED' && <span style={{color: '#ff3333', fontSize: '0.7rem'}}>(FOLD)</span>}
                {player.cards.length > 0 && !player.cards[0].hidden && (
                  <span style={{ color: '#aaa', fontSize: '0.75rem', marginLeft: '4px' }}>
                    ({evaluateBestHand(player.cards, visibleBoard).name})
                  </span>
                )}
              </div>
              <div style={{ color: '#d4af37', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.8rem' }}>
                ${player.chips}
              </div>
              
              <div style={{ position: 'relative', minHeight: '100px', width: '70px', opacity: player.status === 'FOLDED' ? 0.5 : 1 }}>
                {player.cards.length === 0 && (
                  <div style={{ width: '70px', height: '100px', border: '2px dashed rgba(255,255,255,0.3)', borderRadius: '8px' }} />
                )}
                <div style={{ display: 'flex', gap: '8px', position: 'absolute', top: 0, left: player.cards.length > 1 ? `-${(player.cards.length - 1) * 20}px` : 0 }}>
                  {player.cards.map((card: Card, i: number) => {
                    // Prevent hiding my own cards!
                    const isCardHidden = card.hidden && !isMe
                    return (
                    <motion.div 
                      key={i} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                      style={{
                        width: '70px', height: '100px', borderRadius: '8px', background: isCardHidden ? 'linear-gradient(135deg, #b30000 0%, #660000 100%)' : '#fff',
                        border: '1px solid #000', boxShadow: '2px 5px 10px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column', color: isCardHidden ? '#fff' : (['♥️','♦️'].includes(card.suit) ? '#d00' : '#000'),
                        position: 'relative', zIndex: i,
                        borderWidth: isCardHidden ? '3px' : '1px', borderColor: isCardHidden ? '#fff' : '#000'
                      }}
                    >
                      {!isCardHidden && (
                        <>
                          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', alignSelf: 'flex-start', marginLeft: '6px' }}>{card.rank}</span>
                          <span style={{ fontSize: '2.5rem', marginTop: '-10px' }}>{card.suit}</span>
                        </>
                      )}
                    </motion.div>
                  )})}
                </div>
              </div>
              
              {/* Player Bet Amount on Table */}
              {player.currentBet > 0 && (
                <div style={{ position: 'absolute', bottom: '-40px', background: 'rgba(0,0,0,0.5)', border: '1px solid #d4af37', borderRadius: '12px', padding: '4px 12px', color: '#d4af37', fontWeight: 'bold', fontSize: '0.8rem', zIndex: 2 }}>
                  Bet: ${player.currentBet}
                </div>
              )}
            </div>
          )
        })}

      </div>

      {/* CONTROLS */}
      <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '16px', zIndex: 10 }}>
        {isLobby ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(0,0,0,0.6)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.3)', backdropFilter: 'blur(5px)' }}>
            <button className="btn-primary" style={{ padding: '16px 32px', fontSize: '1.2rem', boxShadow: '0 0 15px rgba(212,175,55,0.4)' }} onClick={() => handleAction(() => dealHand(tableId))} disabled={isProcessing}>
              DEAL NEW HAND
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '16px', background: 'rgba(0,0,0,0.6)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.3)', backdropFilter: 'blur(5px)', opacity: isPlayerTurn ? 1 : 0.5 }}>
            <button className="btn-primary" style={{ background: '#ff3333', padding: '16px 32px', fontSize: '1.2rem', minWidth: '120px' }} onClick={() => handleAction(() => playerAction(tableId, 'FOLD'))} disabled={isProcessing || !isPlayerTurn}>
              FOLD
            </button>
            <button className="btn-primary" style={{ background: '#0055ff', padding: '16px 32px', fontSize: '1.2rem', minWidth: '120px' }} onClick={() => handleAction(() => playerAction(tableId, 'CALL'))} disabled={isProcessing || !isPlayerTurn}>
              CALL
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '16px' }}>
              <input 
                type="number" value={raiseAmount} onChange={e => setRaiseAmount(Number(e.target.value))} 
                style={{ width: '120px', padding: '8px', borderRadius: '8px', border: 'none', textAlign: 'center', fontWeight: 'bold' }}
                disabled={isProcessing || !isPlayerTurn}
              />
              <button className="btn-primary" style={{ background: '#ff9900', padding: '8px 16px', fontSize: '1.2rem', minWidth: '120px' }} onClick={() => handleAction(() => playerAction(tableId, 'RAISE', raiseAmount))} disabled={isProcessing || !isPlayerTurn}>
                RAISE
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
