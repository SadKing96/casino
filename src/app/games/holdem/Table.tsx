import { useUser } from '@/context/UserContext'
import { getTableState, dealHand, playerAction, chatWithDealer } from './actions'
import { Card, PlayerState, evaluateBestHand } from './utils'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { io } from 'socket.io-client'

export default function HoldemTable({ tableId, onLeave }: { tableId: string, onLeave: () => void }) {
  const { user, updateCredits } = useUser()
  const [gameState, setGameState] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [raiseAmount, setRaiseAmount] = useState(50)
  
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<{sender: string, text: string}[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  const [chipHistory, setChipHistory] = useState<{amount: number, type: string, id: number}[]>([])
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
      fetchState()
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
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001')
    socket.emit('action_taken', tableId)
    socket.disconnect()
  }

  const handleAction = async (actionFn: () => Promise<any>) => {
    if (!user) return
    setIsProcessing(true)
    const oldBalance = user.credits

    try {
      const result = await actionFn()
      setGameState(result.state)
      await notifyOthers()
      
      if (result.newBalance !== undefined) {
        const diff = result.newBalance - oldBalance
        if (diff !== 0) {
          setChipHistory(prev => [{ amount: diff, type: diff > 0 ? 'win' : 'loss', id: Date.now() }, ...prev].slice(0, 50))
        }
        updateCredits(result.newBalance)
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
  const amountToCall = humanPlayer ? (gameState.currentBet - humanPlayer.currentBet) : 0
  const canCheck = amountToCall === 0

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
  const seatLayout = [displayPlayers[0], displayPlayers[1], displayPlayers[2], displayPlayers[3], displayPlayers[4]]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
      
      {/* LEFT: MAIN TABLE AREA */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Navigation */}
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 50, display: 'flex', gap: '10px' }}>
          <button onClick={onLeave} className="btn-secondary" style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.1)' }}>← Leave Table</button>
        </div>

        {/* Premium Table Graphic */}
        <div style={{ 
          position: 'absolute', top: '10%', bottom: '20%', left: '5%', right: '5%',
          background: 'radial-gradient(ellipse at center, #1b5e20 0%, #00251a 100%)',
          borderRadius: '500px', border: '15px solid #3e2723',
          boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8), 0 20px 50px rgba(0,0,0,0.9)',
          pointerEvents: 'none'
        }}>
          {/* Inner Felt Ring */}
          <div style={{
            position: 'absolute', top: '30px', bottom: '30px', left: '30px', right: '30px',
            border: '2px solid rgba(255,255,255,0.1)', borderRadius: '450px',
            pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
            <h1 style={{ fontSize: '3rem', color: 'rgba(255,255,255,0.05)', margin: 0, marginTop: '-50px', fontFamily: 'serif', letterSpacing: '10px' }}>KINGZ</h1>
            <p style={{ color: 'rgba(255,255,255,0.1)', fontSize: '1rem', letterSpacing: '5px' }}>TEXAS HOLD'EM</p>
          </div>
        </div>

        {/* Dealer Spot */}
        <div style={{ position: 'absolute', top: '2%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%', border: '4px solid #d4af37',
            backgroundImage: 'url(/images/dealer_rusty.png)', backgroundSize: 'cover', backgroundPosition: 'center 20%',
            boxShadow: '0 10px 20px rgba(0,0,0,0.8)'
          }} />
          <div style={{ background: '#111', color: '#d4af37', padding: '4px 16px', borderRadius: '12px', marginTop: '-15px', fontWeight: 'bold', border: '1px solid #d4af37', fontSize: '0.9rem', zIndex: 2 }}>
            DEALER RUSTY
          </div>
        </div>

        {/* Community Cards & Pot */}
        <div style={{ position: 'absolute', top: '25%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
          <div style={{ background: 'rgba(0,0,0,0.6)', padding: '8px 24px', borderRadius: '20px', border: '1px solid rgba(212,175,55,0.3)', marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#aaa', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px' }}>Total Pot</span>
            <span style={{ color: '#d4af37', fontSize: '2rem', fontWeight: 'bold', textShadow: '0 0 10px rgba(212,175,55,0.5)' }}>${gameState.potAmount || 0}</span>
            {gameState.currentBet > 0 && <span style={{ color: '#fff', fontSize: '0.8rem', opacity: 0.8, marginTop: '4px' }}>Current Bet: ${gameState.currentBet}</span>}
          </div>
          
          <div style={{ display: 'flex', gap: '12px', minHeight: '120px', minWidth: '400px', justifyContent: 'center' }}>
            {visibleBoard.map((card: Card, i: number) => (
              <motion.div 
                key={i} initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                style={{
                  width: '80px', height: '115px', borderRadius: '8px', background: '#fff',
                  border: '1px solid #000', boxShadow: '0 10px 20px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', color: ['♥️','♦️'].includes(card.suit) ? '#d00' : '#000'
                }}
              >
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', alignSelf: 'flex-start', marginLeft: '6px' }}>{card.rank}</span>
                <span style={{ fontSize: '3rem', marginTop: '-15px' }}>{card.suit}</span>
              </motion.div>
            ))}
            {[...Array(Math.max(0, 5 - visibleBoard.length))].map((_, i) => (
               <div key={`p-${i}`} style={{ width: '80px', height: '115px', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '8px' }} />
            ))}
          </div>
        </div>

        {/* 5 Player Seats */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
          {seatLayout.map((player, index) => {
            // Calculate curved positions
            // Center seat (index 2) is at the bottom center.
            // Seats 1 and 3 are at bottom-left and bottom-right.
            // Seats 0 and 4 are at mid-left and mid-right.
            const isCenter = index === 2
            const isMidLeft = index === 1
            const isMidRight = index === 3
            const isTopLeft = index === 0
            const isTopRight = index === 4

            let left = 'auto', right = 'auto', top = 'auto', bottom = 'auto', transform = 'none'

            if (isCenter) { left = '50%'; bottom = '35%'; transform = 'translateX(-50%)' }
            else if (isMidLeft) { left = '20%'; bottom = '45%'; transform = 'translateX(-50%)' }
            else if (isMidRight) { right = '20%'; bottom = '45%'; transform = 'translateX(50%)' }
            else if (isTopLeft) { left = '10%'; top = '30%'; transform = 'translateY(-50%)' }
            else if (isTopRight) { right = '10%'; top = '30%'; transform = 'translateY(-50%)' }

            if (!player) return (
              <div key={index} style={{ position: 'absolute', left, right, top, bottom, transform, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.3 }}>
                <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '10px' }}>SEAT OPEN</div>
                <div style={{ width: '70px', height: '100px', border: '2px dashed rgba(255,255,255,0.5)', borderRadius: '8px' }} />
              </div>
            )
            
            const isMe = player.id === user?.id
            const isMyTurn = gameState.currentTurnIndex === index && player.status === 'ACTIVE'

            return (
              <div key={player.id} style={{ position: 'absolute', left, right, top, bottom, transform, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: player.status === 'OUT' ? 0.3 : 1, zIndex: 20 }}>
                
                {isMyTurn && !isLobby && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    style={{ position: 'absolute', top: '-40px', background: '#ffcc00', color: '#000', padding: '4px 12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.8rem', boxShadow: '0 0 15px #ffcc00', zIndex: 20 }}
                  >
                    THINKING...
                  </motion.div>
                )}

                {gameState.dealerButtonIndex === index && (
                  <div style={{ position: 'absolute', left: '-30px', top: '10px', width: '30px', height: '30px', background: '#fff', borderRadius: '50%', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '2px solid #000', boxShadow: '0 2px 5px rgba(0,0,0,0.5)', fontSize: '0.8rem', zIndex: 30 }}>
                    D
                  </div>
                )}

                <div style={{ background: isMyTurn ? 'rgba(255,204,0,0.2)' : 'rgba(0,0,0,0.7)', border: isMyTurn ? '2px solid #ffcc00' : '1px solid rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px', backdropFilter: 'blur(4px)' }}>
                  <div style={{ color: isMe ? '#ffcc00' : '#fff', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {player.name} {isMe && '(You)'} 
                    {player.status === 'FOLDED' && <span style={{color: '#ff3333', fontSize: '0.7rem'}}>(FOLD)</span>}
                    {player.status === 'ALL_IN' && <span style={{color: '#00ffcc', fontSize: '0.7rem'}}>(ALL-IN)</span>}
                  </div>
                  <div style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '1rem' }}>
                    ${player.chips}
                  </div>
                </div>
                
                <div style={{ position: 'relative', minHeight: '100px', width: '80px', opacity: player.status === 'FOLDED' ? 0.4 : 1 }}>
                  {player.cards.length === 0 && (
                    <div style={{ width: '80px', height: '115px', border: '2px dashed rgba(255,255,255,0.3)', borderRadius: '8px' }} />
                  )}
                  <div style={{ display: 'flex', position: 'absolute', top: 0, left: player.cards.length > 1 ? `-${(player.cards.length - 1) * 15}px` : 0 }}>
                    {player.cards.map((card: Card, i: number) => {
                      const isCardHidden = card.hidden && !isMe
                      return (
                      <motion.div 
                        key={i} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                        style={{
                          width: '80px', height: '115px', borderRadius: '8px', background: isCardHidden ? 'linear-gradient(135deg, #b30000 0%, #660000 100%)' : '#fff',
                          border: '1px solid #000', boxShadow: '2px 5px 10px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexDirection: 'column', color: isCardHidden ? '#fff' : (['♥️','♦️'].includes(card.suit) ? '#d00' : '#000'),
                          position: 'absolute', zIndex: i, left: `${i * 30}px`,
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
                
                {/* Bet Indicator */}
                {player.currentBet > 0 && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ position: 'absolute', bottom: '-40px', background: 'rgba(0,0,0,0.8)', border: '2px solid #d4af37', borderRadius: '20px', padding: '4px 16px', color: '#d4af37', fontWeight: 'bold', fontSize: '1rem', zIndex: 20, boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
                    Bet: ${player.currentBet}
                  </motion.div>
                )}
                
                {/* Hand Evaluation (If visible) */}
                {player.cards.length > 0 && !player.cards[0].hidden && visibleBoard.length >= 3 && (
                   <div style={{ position: 'absolute', top: '-25px', background: 'rgba(0,0,0,0.8)', color: '#aaa', padding: '2px 8px', borderRadius: '8px', fontSize: '0.7rem', border: '1px solid #333', whiteSpace: 'nowrap' }}>
                     {evaluateBestHand(player.cards, visibleBoard).name}
                   </div>
                )}

              </div>
            )
          })}
        </div>

        {/* BETTING CONSOLE (BOTTOM) */}
        <div style={{ position: 'absolute', bottom: '140px', left: 0, right: 0, padding: '20px', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', display: 'flex', justifyContent: 'center', pointerEvents: 'auto', zIndex: 100 }}>
          {isLobby ? (
            <button className="btn-primary" style={{ padding: '20px 40px', fontSize: '1.5rem', boxShadow: '0 0 20px rgba(212,175,55,0.4)' }} onClick={() => handleAction(() => dealHand(tableId))} disabled={isProcessing}>
              DEAL NEW HAND
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '20px', background: 'rgba(0,0,0,0.8)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', opacity: isPlayerTurn ? 1 : 0.5, transition: 'opacity 0.3s' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button className="btn-secondary" style={{ background: '#331111', color: '#ff4444', border: '1px solid #ff4444', padding: '16px 32px', fontSize: '1.2rem', minWidth: '140px', borderRadius: '12px' }} onClick={() => handleAction(() => playerAction(tableId, 'FOLD'))} disabled={isProcessing || !isPlayerTurn}>
                  FOLD
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button className="btn-primary" style={{ background: canCheck ? '#00cc66' : '#0055ff', padding: '16px 32px', fontSize: '1.2rem', minWidth: '140px', borderRadius: '12px' }} onClick={() => handleAction(() => playerAction(tableId, 'CALL'))} disabled={isProcessing || !isPlayerTurn}>
                  {canCheck ? 'CHECK' : `CALL $${amountToCall}`}
                </button>
              </div>

              <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 10px' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.9rem' }} onClick={() => setRaiseAmount(Math.max(20, amountToCall * 2))} disabled={isProcessing || !isPlayerTurn}>2x</button>
                  <button className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.9rem' }} onClick={() => setRaiseAmount(Math.max(20, gameState.potAmount))} disabled={isProcessing || !isPlayerTurn}>Pot</button>
                  <button className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.9rem', color: '#00ffcc', borderColor: '#00ffcc' }} onClick={() => setRaiseAmount(humanPlayer?.chips || 0)} disabled={isProcessing || !isPlayerTurn}>ALL IN</button>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="number" value={raiseAmount} onChange={e => setRaiseAmount(Number(e.target.value))} 
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
                    disabled={isProcessing || !isPlayerTurn}
                  />
                  <button className="btn-primary" style={{ background: '#ff9900', padding: '12px 24px', fontSize: '1.2rem', borderRadius: '12px' }} onClick={() => handleAction(() => playerAction(tableId, 'RAISE', raiseAmount))} disabled={isProcessing || !isPlayerTurn || raiseAmount <= 0}>
                    RAISE
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* FLOATING CREDITS (TOP RIGHT) */}
      <div style={{ position: 'absolute', top: '80px', right: '20px', padding: '16px 24px', background: 'rgba(0,0,0,0.8)', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.5)', boxShadow: '0 10px 30px rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 100, textAlign: 'center' }}>
        <div style={{ color: '#d4af37', fontSize: '0.8rem', opacity: 0.9, letterSpacing: '2px', marginBottom: '4px', fontWeight: 'bold' }}>YOUR CREDITS</div>
        <div style={{ fontSize: '2rem', color: '#fff', textShadow: '0 0 10px rgba(212,175,55,0.5)', fontWeight: 'bold' }}>${user?.credits.toLocaleString()}</div>
      </div>

      {/* FLOATING CHAT (TOP LEFT) */}
      <div style={{ position: 'absolute', top: '80px', left: '20px', width: '320px', height: '260px', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.8)', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.5)', boxShadow: '0 10px 30px rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 100, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, transparent 100%)', borderBottom: '1px solid rgba(212, 175, 55, 0.3)', fontWeight: 'bold', color: '#d4af37', fontSize: '0.9rem' }}>
          TABLE CHAT
        </div>
        
        <div ref={chatScrollRef} style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {chatHistory.map((msg, i) => {
            const isDealer = msg.sender === 'Rusty'
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isDealer ? 'flex-start' : 'flex-end' }}>
                <span style={{ fontSize: '0.8rem', color: isDealer ? '#d4af37' : '#aaa', marginBottom: '2px', fontWeight: 'bold' }}>{msg.sender}</span>
                <div style={{ background: isDealer ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255,255,255,0.1)', border: isDealer ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255,255,255,0.2)', padding: '8px 12px', borderRadius: '12px', borderBottomLeftRadius: isDealer ? 0 : '12px', borderBottomRightRadius: isDealer ? '12px' : 0, color: '#fff', fontSize: '0.9rem', maxWidth: '90%' }}>
                  {msg.text}
                </div>
              </div>
            )
          })}
          {isTyping && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.8rem', color: '#d4af37', marginBottom: '2px', fontWeight: 'bold' }}>Rusty</span>
              <div style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', padding: '8px 12px', borderRadius: '12px', borderBottomLeftRadius: 0, color: '#fff', fontSize: '0.9rem' }}>
                <span className="typing-dots">...</span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleChatSubmit} style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '8px' }}>
          <input 
            type="text" value={chatMessage} onChange={e => setChatMessage(e.target.value)}
            placeholder="Message..."
            style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', outline: 'none', padding: '6px 10px', fontSize: '0.9rem' }}
            disabled={isTyping}
          />
          <button type="submit" style={{ background: 'linear-gradient(135deg, #f2a900 0%, #d48e00 100%)', color: '#000', border: 'none', borderRadius: '6px', padding: '6px 12px', fontWeight: 'bold', fontSize: '0.85rem', cursor: isTyping ? 'not-allowed' : 'pointer', opacity: isTyping ? 0.5 : 1, marginLeft: '6px' }} disabled={isTyping}>
            SEND
          </button>
        </form>
      </div>

    </div>
  )
}
