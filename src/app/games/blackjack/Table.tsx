'use client'

import { useUser } from '@/context/UserContext'
import { getTableState, joinTable, leaveTable, placeBet, checkAutoDeal, hit, stand, doubleDown, split, surrender, buyInsurance, resolveInsurance, nextRound, checkAutoNextRound, PlayerState, Hand } from './actions'
import { Card, calculateScore, calculateScoreString } from './utils'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Socket } from 'socket.io-client'
import { connectSocket } from '@/lib/socket'

const CHIP_DENOMS: { value: number, bg: string, edge: string, text: string }[] = [
  { value: 500, bg: '#6a1b9a', edge: '#e1bee7', text: '#fff' },
  { value: 100, bg: '#111', edge: '#d4af37', text: '#d4af37' },
  { value: 50, bg: '#c62828', edge: '#fff', text: '#fff' },
  { value: 10, bg: '#1e63c9', edge: '#fff', text: '#fff' },
]

function breakIntoChips(amount: number, maxChips = 5) {
  const chips: typeof CHIP_DENOMS = []
  let rem = amount
  for (const d of CHIP_DENOMS) {
    while (rem >= d.value) { chips.push(d); rem -= d.value }
  }
  if (chips.length === 0 && amount > 0) chips.push(CHIP_DENOMS[3])
  // keep the largest denominations visible, cap the stack height
  return chips.slice(0, maxChips).reverse()
}

function ChipStack({ amount, size = 34 }: { amount: number, size?: number }) {
  const chips = breakIntoChips(amount)
  const step = Math.round(size * 0.14)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size + step * (chips.length - 1) }}>
        {chips.map((c, idx) => (
          <motion.div
            key={idx}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            style={{
              position: 'absolute', left: 0, bottom: idx * step, width: size, height: size, borderRadius: '50%',
              background: `repeating-conic-gradient(${c.bg} 0deg 30deg, ${c.edge} 30deg 45deg)`,
              boxShadow: '0 2px 3px rgba(0,0,0,0.6)', zIndex: idx,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <div style={{ width: size * 0.66, height: size * 0.66, borderRadius: '50%', background: c.bg, border: `1px dashed ${c.edge}`,
              color: c.text, fontSize: size * 0.26, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {idx === chips.length - 1 ? c.value : ''}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default function BlackjackTableUI({ tableId, onLeave }: { tableId: string, onLeave: () => void }) {
  const { user } = useUser()
  const [table, setTable] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [betAmount, setBetAmount] = useState(10)
  
  // Side Bets State
  const [sideBets, setSideBets] = useState({ twentyOnePlusThree: 0, perfectPairs: 0, luckyLadies: 0, bustIt: 0 })

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  // Dealer Animation State
  const [displayedDealerCount, setDisplayedDealerCount] = useState(2)

  // Chat State
  const [chatHistory, setChatHistory] = useState<string[]>([])
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // Socket
  const socketRef = useRef<Socket | null>(null)

  // Toast notice
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showNotice = (msg: string) => {
    setNotice(msg)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), 2500)
  }

  const loadTable = async () => {
    const t = await getTableState(tableId)
    setTable(t)
    if (t?.chatHistory) {
      setChatHistory(JSON.parse(t.chatHistory))
    }
  }

  useEffect(() => {
    loadTable()

    const socket = connectSocket()
    socketRef.current = socket
    
    socket.on('connect', () => {
      if (user) {
        socket.emit('authenticate', { userId: user.id, username: user.username })
      }
      socket.emit('join_table', `blackjack_${tableId}`)
    })

    socket.on('update_required', () => {
      loadTable()
    })

    return () => {
      socket.emit('leave_table', `blackjack_${tableId}`)
      socket.disconnect()
    }
  }, [tableId, user?.id])

  // Timer effect
  useEffect(() => {
    if (!table || !table.timerEndsAt) {
      setTimeLeft(null)
      return
    }
    
    const endsAt = new Date(table.timerEndsAt).getTime()
    
    const interval = setInterval(() => {
      const now = Date.now()
      if (endsAt <= now) {
        setTimeLeft(0)
        clearInterval(interval)
        if (table.status === 'BETTING') {
          checkAutoDeal(tableId).then(() => {
            socketRef.current?.emit('action_taken', `blackjack_${tableId}`)
            loadTable()
          })
        } else if (table.status === 'INSURANCE') {
          resolveInsurance(tableId).then(() => {
            socketRef.current?.emit('action_taken', `blackjack_${tableId}`)
            loadTable()
          })
        } else if (table.status === 'RESOLVED') {
          checkAutoNextRound(tableId).then(() => {
            socketRef.current?.emit('action_taken', `blackjack_${tableId}`)
            loadTable()
          })
        }
      } else {
        setTimeLeft(Math.ceil((endsAt - now) / 1000))
      }
    }, 100)

    return () => clearInterval(interval)
  }, [table?.timerEndsAt, table?.status, tableId])

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatHistory])

  // Dealer Animation
  useEffect(() => {
    const dHand = table?.dealerHand ? JSON.parse(table.dealerHand) : []
    const isRes = table?.status === 'RESOLVED'
    
    if (isRes && dHand.length > displayedDealerCount) {
      const timer = setTimeout(() => {
        setDisplayedDealerCount(prev => prev + 1)
      }, 800)
      return () => clearTimeout(timer)
    } else if (!isRes && displayedDealerCount !== 2) {
      setDisplayedDealerCount(2)
    }
  }, [table?.status, table?.dealerHand, displayedDealerCount])

  const handleAction = async (actionFn: () => Promise<any>) => {
    setIsProcessing(true)
    try {
      await actionFn()
      socketRef.current?.emit('action_taken', `blackjack_${tableId}`)
      await loadTable()
    } catch (e: any) {
      console.error(e)
    }
    setIsProcessing(false)
  }

  const handleLeave = async () => {
    await leaveTable(tableId)
    socketRef.current?.emit('action_taken', `blackjack_${tableId}`)
    onLeave()
  }

  const handleSit = async (seatIndex: number) => {
    setIsProcessing(true)
    try {
      await joinTable(tableId, seatIndex)
      socketRef.current?.emit('action_taken', `blackjack_${tableId}`)
    } catch (e: any) {
      console.error(e)
      showNotice('Seat just taken')
    }
    await loadTable()
    setIsProcessing(false)
  }

  const toggleSideBet = (type: keyof typeof sideBets) => {
    setSideBets(prev => ({
      ...prev,
      [type]: prev[type] === 0 ? Math.max(betAmount / 2, 5) : 0
    }))
  }

  if (!table) return <div style={{ color: '#fff', textAlign: 'center', marginTop: '100px' }}>Loading table...</div>

  const playerStates: Record<string, PlayerState> = JSON.parse(table.playerStates || '{}')
  const myState = user ? playerStates[user.id] : null
  const dealerHand: Card[] = JSON.parse(table.dealerHand || '[]')
  const shoeData: Card[] = JSON.parse(table.shoe || '[]')
  
  const isBetting = table.status === 'BETTING'
  const isInsurance = table.status === 'INSURANCE'
  const isPlaying = table.status === 'PLAYING'
  const isResolved = table.status === 'RESOLVED'

  const seats = [0, 1, 2, 3, 4].map(index => {
    const pId = Object.keys(playerStates).find(k => playerStates[k].seatIndex === index)
    return pId ? { id: pId, ...playerStates[pId] } : null
  })

  const visibleDealerHand = isResolved ? dealerHand.slice(0, displayedDealerCount) : dealerHand.filter(c => !c.hidden)
  const dScoreStr = calculateScoreString(visibleDealerHand)

  // Find active hand for current player
  let activeHandId: string | null = null
  if (myState && myState.status === 'PLAYING') {
    const activeHand = myState.hands.find(h => h.status === 'PLAYING')
    if (activeHand) activeHandId = activeHand.id
  }

  // Round outcome (only once the dealer has finished revealing cards)
  const dealerDoneRevealing = isResolved && displayedDealerCount >= dealerHand.length
  const handOutcome = (h: Hand): 'WIN' | 'PUSH' | 'LOSE' | 'SURRENDER' =>
    h.status === 'SURRENDER' ? 'SURRENDER' : h.payout > h.bet ? 'WIN' : h.payout === h.bet && h.bet > 0 ? 'PUSH' : 'LOSE'
  const myHands: Hand[] = myState?.hands ?? []
  const myNet = myHands.reduce((acc, h) => acc + h.payout - h.bet, 0)
  const myResult: 'WIN' | 'PUSH' | 'LOSE' | null =
    dealerDoneRevealing && myHands.length > 0 && myState?.status !== 'SKIPPED'
      ? (myNet > 0 ? 'WIN' : myNet === 0 ? 'PUSH' : 'LOSE')
      : null
  const anyBust = myHands.some(h => h.status === 'BUST')

  // Ready-up for next round
  const roundParticipants = Object.values(playerStates).filter(p => p.readyForNext !== undefined)
  const readyCount = roundParticipants.filter(p => p.readyForNext).length
  const iAmReady = !!myState?.readyForNext
  const seatNet = (p: PlayerState) => p.hands.reduce((acc, h) => acc + (h.payout || 0) - h.bet, 0)

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      flex: 1, width: '100%',
      background: 'radial-gradient(circle at 50% 50%, #006600 0%, #002200 100%)',
      position: 'relative', overflow: 'hidden',
      borderRadius: '20px',
      margin: '0 auto'
    }}>
      
      {/* TOP BAR */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px', display: 'flex', justifyContent: 'space-between', zIndex: 100 }}>
        <button onClick={handleLeave} className="btn-secondary" style={{ background: 'rgba(0,0,0,0.5)' }}>Leave Table</button>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>{table.name}</div>
          <div style={{ color: '#aaa', fontSize: '0.9rem', border: '1px solid #555', padding: '4px 8px', borderRadius: '4px' }}>Shoe: {shoeData.length}/312 cards</div>
        </div>
        <div style={{ color: '#00ffcc', fontSize: '1.2rem', fontWeight: 'bold' }}>Credits: ${user?.credits.toLocaleString()}</div>
      </div>

      {/* LOSS FLASH: red vignette pulse across the table */}
      <AnimatePresence>
        {myResult === 'LOSE' && (
          <motion.div
            key="loss-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0.35] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4, borderRadius: '20px',
              background: 'radial-gradient(ellipse at center, transparent 35%, rgba(200, 0, 30, 0.55) 100%)',
              boxShadow: 'inset 0 0 80px rgba(255, 30, 60, 0.6)' }}
          />
        )}
      </AnimatePresence>
      <div style={{
        position: 'absolute', top: '-150px', left: '50%', transform: 'translateX(-50%)',
        width: '800px', height: '400px', background: 'radial-gradient(circle at 50% 0%, #111 0%, #000 100%)', 
        borderRadius: '0 0 400px 400px', boxShadow: '0 20px 50px rgba(0,0,0,0.9)', 
        zIndex: 5, borderBottom: '3px solid rgba(212, 175, 55, 0.3)'
      }} />

      {/* FELT GRAPHICS */}
      <div style={{ 
        position: 'absolute', top: '30%', width: '1200px', height: '600px', 
        pointerEvents: 'none', display: 'flex', justifyContent: 'center' 
      }}>
        {/* Watermark Logo */}
        <div style={{ position: 'absolute', top: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.15 }}>
          <div style={{ fontSize: '6rem', fontWeight: '900', color: '#d4af37', letterSpacing: '10px', textTransform: 'uppercase', textShadow: '0 0 20px #d4af37', margin: 0, lineHeight: '1' }}>KINGZ</div>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#fff', letterSpacing: '20px', marginTop: '-10px', marginLeft: '20px' }}>CASINO</div>
        </div>

        <svg width="1200" height="600" viewBox="0 0 1200 600" style={{ position: 'absolute' }}>
          <path d="M 0 600 A 600 600 0 0 1 1200 600" fill="none" stroke="rgba(212, 175, 55, 0.4)" strokeWidth="4" />
          <path id="insurance-path" d="M 150 600 A 450 450 0 0 1 1050 600" fill="none" stroke="rgba(212, 175, 55, 0.3)" strokeWidth="2" />
          
          <path id="bj-pays-path" d="M 260 600 A 340 340 0 0 1 940 600" fill="none" />
          <path id="dealer-rules-path" d="M 210 600 A 390 390 0 0 1 990 600" fill="none" />
          <path id="insurance-text-path" d="M 170 600 A 430 430 0 0 1 1030 600" fill="none" />

          <text fill="rgba(212, 175, 55, 0.9)" fontSize="34" fontWeight="bold" letterSpacing="4">
            <textPath href="#bj-pays-path" startOffset="50%" textAnchor="middle">BLACKJACK PAYS 3 TO 2</textPath>
          </text>
          <text fill="rgba(255, 255, 255, 0.7)" fontSize="18" fontWeight="bold" letterSpacing="2">
            <textPath href="#dealer-rules-path" startOffset="50%" textAnchor="middle">Dealer must draw to 16 and stand on all 17s</textPath>
          </text>
          <text fill="rgba(212, 175, 55, 0.7)" fontSize="24" fontWeight="bold" letterSpacing="4">
            <textPath href="#insurance-text-path" startOffset="50%" textAnchor="middle">INSURANCE PAYS 2 TO 1</textPath>
          </text>
        </svg>
      </div>

      {/* LEATHER RAIL */}
      <div style={{ 
        position: 'absolute', bottom: '-50px', left: '-10%', right: '-10%', height: '180px', 
        borderRadius: '50% 50% 0 0', background: 'linear-gradient(to bottom, #3a2000, #1a0b00)', 
        boxShadow: '0 -15px 30px rgba(0,0,0,0.8)', pointerEvents: 'none', zIndex: 5,
        borderTop: '5px solid #2a1500'
      }} />

      {/* TIMER DISPLAY */}
      {timeLeft !== null && timeLeft > 0 && (
        <div style={{ position: 'absolute', top: '150px', left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
          <div style={{ background: 'rgba(0,0,0,0.8)', color: isResolved ? '#00ffaa' : '#ffcc00', padding: '10px 20px', borderRadius: '20px', border: `2px solid ${isResolved ? '#00ffaa' : '#ffcc00'}`, fontWeight: 'bold', fontSize: '1.2rem', boxShadow: `0 0 15px ${isResolved ? 'rgba(0,255,170,0.5)' : 'rgba(255,204,0,0.5)'}`, whiteSpace: 'nowrap' }}>
            {isResolved
              ? `Next round in ${timeLeft}s · ${readyCount}/${roundParticipants.length} ready`
              : isInsurance ? `Insurance Decision... ${timeLeft}s` : isBetting ? `Dealing in ${timeLeft}s` : `${timeLeft}s`}
          </div>
        </div>
      )}

      {/* TOAST NOTICE */}
      <AnimatePresence>
        {notice && (
          <motion.div
            key="notice"
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 200,
              background: 'rgba(60,0,10,0.92)', color: '#ffb3c0', border: '1px solid #ff3355', borderRadius: '12px',
              padding: '10px 22px', fontWeight: 'bold', boxShadow: '0 0 20px rgba(255,30,60,0.5)' }}
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* DEALER PORTRAIT */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px', position: 'relative', zIndex: 10, marginTop: '90px' }}>
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
        <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px', opacity: 0.8, fontSize: '0.9rem' }}>DEALER ({visibleDealerHand.length > 0 ? dScoreStr : '?'})</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <AnimatePresence>
            {(isResolved ? dealerHand.slice(0, displayedDealerCount) : dealerHand).map((card: Card, i: number) => (
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
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {myResult === 'WIN' && (
            <motion.div
              key="win"
              initial={{ opacity: 0, scale: 0.5, y: -20 }}
              animate={{ opacity: [0, 1, 0, 1, 1], scale: [1, 1.2, 1, 1.2, 1], y: 0 }}
              transition={{ duration: 1.5 }}
              style={{ marginTop: '15px', color: '#00ffaa', fontWeight: '900', fontSize: '3rem', textShadow: '0 0 20px #00ffaa', textTransform: 'uppercase', letterSpacing: '8px', textAlign: 'center' }}
            >
              WINNER
              <div style={{ fontSize: '1.4rem', letterSpacing: '2px' }}>+${myNet.toLocaleString()}</div>
            </motion.div>
          )}
          {myResult === 'PUSH' && (
            <motion.div
              key="push"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              style={{ marginTop: '15px', color: '#e0e0e0', fontWeight: '900', fontSize: '2.6rem', textShadow: '0 0 16px rgba(255,255,255,0.5)', letterSpacing: '8px', textAlign: 'center' }}
            >
              PUSH
              <div style={{ fontSize: '1rem', letterSpacing: '2px', opacity: 0.8 }}>Bet returned</div>
            </motion.div>
          )}
          {myResult === 'LOSE' && (
            <motion.div
              key="lose"
              initial={{ opacity: 0, scale: 1.6 }}
              animate={{ opacity: 1, scale: 1, x: [0, -14, 14, -10, 10, -5, 5, 0] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ marginTop: '15px', padding: '8px 28px', borderRadius: '14px', textAlign: 'center',
                background: 'rgba(40, 0, 8, 0.85)', border: '2px solid #ff3355',
                boxShadow: '0 0 30px rgba(255, 30, 60, 0.6)' }}
            >
              <div style={{ color: '#ff3355', fontWeight: '900', fontSize: '2.8rem', letterSpacing: '6px', textShadow: '0 0 18px #ff1a40', lineHeight: 1.1 }}>
                {anyBust && myHands.every(h => h.status === 'BUST') ? 'BUST' : 'DEALER WINS'}
              </div>
              <div style={{ color: '#ff8899', fontWeight: 700, fontSize: '1.3rem', letterSpacing: '2px' }}>−${Math.abs(myNet).toLocaleString()}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 5 PLAYER SEATS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '1400px', padding: '0 60px', marginTop: '30px', zIndex: 10, position: 'relative' }}>
        {seats.map((seat, i) => {
          const isMe = seat && user && seat.id === user.id
          const marginTops = ['-160px', '-80px', '-30px', '-80px', '-160px']
          
          if (!seat) {
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.6, marginTop: marginTops[i] }}>
                <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px', fontSize: '0.8rem' }}>SEAT OPEN</div>
                <div style={{ width: '70px', height: '100px', border: '2px dashed rgba(255,255,255,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!myState && (
                    <button onClick={() => handleSit(i)} disabled={isProcessing} className="btn-primary" style={{ fontSize: '0.8rem', padding: '4px 8px' }}>SIT</button>
                  )}
                </div>
                <div style={{ width: '80px', height: '80px', border: '3px solid rgba(212, 175, 55, 0.3)', borderRadius: '50%', marginTop: '10px', pointerEvents: 'none' }} />
              </div>
            )
          }

          const isSkipped = seat.status === 'SKIPPED'
          const isReady = seat.status === 'READY'

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: marginTops[i], position: 'relative', width: '200px' }}>
              <div style={{ color: isMe ? '#00ffcc' : '#fff', fontWeight: 'bold', marginBottom: '4px', opacity: isSkipped ? 0.5 : 0.9, fontSize: '0.9rem', textDecoration: isSkipped ? 'line-through' : 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {seat.username}
                {isResolved && seat.readyForNext && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} title="Ready for next round"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', background: '#00c853', color: '#fff', fontSize: '0.75rem', boxShadow: '0 0 8px #00ffaa', textDecoration: 'none' }}>
                    ✓
                  </motion.span>
                )}
              </div>

              {/* Seat result pop (visible to everyone) */}
              <AnimatePresence>
                {dealerDoneRevealing && !isSkipped && seat.hands.length > 0 && (() => {
                  const net = seatNet(seat)
                  const cfg = net > 0
                    ? { text: `+$${net.toLocaleString()}`, color: '#00ffaa', glow: '0 0 12px #00ffaa' }
                    : net < 0
                      ? { text: `-$${Math.abs(net).toLocaleString()}`, color: '#ff3355', glow: '0 0 12px #ff1a40' }
                      : { text: 'PUSH', color: '#bbb', glow: '0 0 8px rgba(255,255,255,0.4)' }
                  return (
                    <motion.div
                      key={`pop-${seat.id}`}
                      initial={{ opacity: 0, y: 10, scale: 0.5 }}
                      animate={{ opacity: [0, 1, 1, 0], y: [10, -10, -30, -60], scale: [0.5, 1.25, 1, 1] }}
                      transition={{ duration: 2.6, times: [0, 0.15, 0.6, 1], ease: 'easeOut' }}
                      style={{ position: 'absolute', top: '-30px', left: '50%', translateX: '-50%', zIndex: 120, pointerEvents: 'none',
                        color: cfg.color, fontWeight: 900, fontSize: '1.7rem', textShadow: cfg.glow, whiteSpace: 'nowrap',
                        background: 'rgba(0,0,0,0.6)', borderRadius: '12px', padding: '2px 12px' }}
                    >
                      {cfg.text}
                    </motion.div>
                  )
                })()}
              </AnimatePresence>
              
              {/* Hands Display */}
              <div style={{ display: 'flex', gap: '15px', minHeight: '120px', justifyContent: 'center' }}>
                {seat.hands.length === 0 && (
                  <div style={{ width: '70px', height: '100px', border: '2px dashed rgba(255,255,255,0.3)', borderRadius: '8px' }} />
                )}
                {seat.hands.map((hand: Hand) => {
                  const pScoreStr = calculateScoreString(hand.cards)
                  const isActiveHand = activeHandId === hand.id && isMe
                  return (
                    <div key={hand.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      <div style={{ fontSize: '1.2rem', color: '#fff', background: '#000', border: '2px solid #d4af37', borderRadius: '12px', padding: '4px 10px', marginBottom: '12px', fontWeight: 'bold', boxShadow: '0 0 10px rgba(212,175,55,0.5)', zIndex: 50 }}>
                        {hand.cards.length > 0 ? pScoreStr : ''}
                      </div>
                      
                      {/* Cards Container */}
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '120px', paddingTop: '10px' }}>
                        {hand.cards.map((card: Card, ci: number) => (
                          <motion.div 
                            key={ci} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                            style={{
                              width: '70px', height: '100px', borderRadius: '8px', background: '#fff', border: '1px solid #000',
                              boxShadow: isActiveHand ? '0 0 15px #00ffcc' : (dealerDoneRevealing && handOutcome(hand) === 'LOSE') ? '0 0 14px rgba(255,40,70,0.9)' : '2px 5px 10px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              filter: dealerDoneRevealing && handOutcome(hand) === 'LOSE' ? 'grayscale(0.6) brightness(0.75)' : 'none',
                              flexDirection: 'column', color: ['♥️','♦️'].includes(card.suit) ? '#d00' : '#000',
                              marginLeft: ci === 0 ? 0 : '-40px',
                              marginTop: ci === 0 ? 0 : `${ci * 12}px`,
                              zIndex: ci,
                              transform: hand.doubleDown && ci === 2 ? 'rotate(90deg) translateY(-20px)' : 'none'
                            }}
                          >
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', alignSelf: 'flex-start', marginLeft: '6px' }}>{card.rank}</span>
                            <span style={{ fontSize: '2.5rem', marginTop: '-10px' }}>{card.suit}</span>
                          </motion.div>
                        ))}
                      </div>

                      {/* Status Badges */}
                      {(['BLACKJACK', 'BUST', 'SURRENDER'] as const).includes(hand.status as any) && (() => {
                        const s = hand.status === 'BLACKJACK'
                          ? { text: 'BLACKJACK!', color: '#ffcc00', border: '#ffcc00', glow: 'rgba(255,204,0,0.6)' }
                          : hand.status === 'BUST'
                            ? { text: 'BUST', color: '#ff3355', border: '#ff3355', glow: 'rgba(255,30,60,0.7)' }
                            : { text: 'SURRENDER', color: '#ccc', border: '#888', glow: 'rgba(0,0,0,0.6)' }
                        return (
                          <motion.div
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                            style={{ position: 'absolute', bottom: '-28px', zIndex: 60, whiteSpace: 'nowrap',
                              color: s.color, fontWeight: 900, fontSize: '1.5rem', letterSpacing: '3px',
                              background: 'rgba(0,0,0,0.85)', border: `2px solid ${s.border}`, borderRadius: '10px',
                              padding: '2px 14px', textShadow: `0 0 10px ${s.glow}`, boxShadow: `0 0 18px ${s.glow}` }}
                          >
                            {s.text}
                          </motion.div>
                        )
                      })()}
                      {dealerDoneRevealing && (() => {
                        const o = handOutcome(hand)
                        if (o === 'SURRENDER') return null
                        const cfg = o === 'WIN'
                          ? { text: `+$${hand.payout - hand.bet}`, color: '#00ffaa', glow: '0 0 15px #00ffaa, 0 0 30px #00ffaa' }
                          : o === 'PUSH'
                            ? { text: 'PUSH', color: '#e0e0e0', glow: '0 0 10px rgba(255,255,255,0.6)' }
                            : { text: `−$${hand.bet}`, color: '#ff3355', glow: '0 0 15px #ff1a40' }
                        return (
                          <motion.div
                            initial={{ scale: 0, y: 20 }}
                            animate={{ scale: [1, 1.2, 1], y: 0 }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            style={{ position: 'absolute', bottom: ['BLACKJACK', 'BUST'].includes(hand.status) ? '-78px' : '-50px', color: cfg.color, fontWeight: '900', fontSize: '2rem', textShadow: cfg.glow, zIndex: 100, whiteSpace: 'nowrap' }}
                          >
                            {cfg.text}
                          </motion.div>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
              
              {/* Betting Circle */}
              <div style={{ position: 'relative', marginTop: '90px' }}>
                <div style={{ 
                  width: '80px', height: '80px', borderRadius: '50%', pointerEvents: 'none', 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                  boxShadow: 'inset 0 0 10px rgba(212, 175, 55, 0.3)',
                  border: isReady ? '3px solid #00ffaa' : '3px solid rgba(212, 175, 55, 0.8)',
                  background: isReady ? 'rgba(0, 255, 170, 0.1)' : 'transparent',
                  position: 'relative'
                }}>
                  {seat.hands.length > 0 && (() => {
                    const total = seat.hands.reduce((acc: number, h: Hand) => acc + h.bet, 0)
                    return (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <ChipStack amount={total} />
                        <div style={{ color: '#ffcc00', fontWeight: 'bold', fontSize: '0.8rem', textShadow: '0 0 5px #000', marginTop: '2px' }}>${total.toLocaleString()}</div>
                      </motion.div>
                    )
                  })()}
                  {isReady && <div style={{ color: '#00ffaa', fontSize: '0.7rem', fontWeight: 'bold', marginTop: '4px' }}>READY</div>}
                  {seat.insuranceBet > 0 && (
                    <div style={{ position: 'absolute', top: '-25px', color: '#ffcc00', fontSize: '0.7rem', border: '1px solid #ffcc00', borderRadius: '10px', padding: '2px 6px', background: 'rgba(0,0,0,0.8)' }}>
                      Ins: ${seat.insuranceBet}
                    </div>
                  )}
                </div>

                {/* Side Bet Mini-Circles */}
                <div style={{ display: 'flex', gap: '5px', position: 'absolute', top: '90px', left: '50%', transform: 'translateX(-50%)' }}>
                  {seat.sideBets && Object.entries(seat.sideBets).map(([key, val]) => {
                    if ((val as number) <= 0) return null
                    const labels: Record<string, string> = { twentyOnePlusThree: '21+3', perfectPairs: 'PP', luckyLadies: 'LL', bustIt: 'BUST' }
                    return (
                      <div key={key} title={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <ChipStack amount={val as number} size={20} />
                        <div style={{ color: '#ffccff', fontSize: '0.55rem', fontWeight: 'bold', textShadow: '0 0 4px #000', whiteSpace: 'nowrap' }}>{labels[key] ?? key} ${val as number}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {isResolved && seat.status === 'SKIPPED' && <div style={{ position: 'absolute', bottom: '90px', color: '#aaa', fontWeight: 'bold', textShadow: '0 0 10px #000' }}>SKIPPED</div>}
            </div>
          )
        })}
      </div>

      {/* CONTROLS - docked bottom-left so they never cover the seats (chat mirrors on the right) */}
      <div style={{ position: 'absolute', bottom: '40px', left: '40px', maxWidth: 'calc(100% - 440px)', display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 100, alignItems: 'flex-start' }}>
        
        {isBetting && myState && myState.status === 'SITTING' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.8)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.5)', backdropFilter: 'blur(5px)' }}>
            
            {/* Sidebets Row */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
              {[
                { key: 'twentyOnePlusThree', label: '21+3' },
                { key: 'perfectPairs', label: 'Perfect Pairs' },
                { key: 'luckyLadies', label: 'Lucky Ladies' },
                { key: 'bustIt', label: 'Bust It!' }
              ].map(sb => (
                <button 
                  key={sb.key} 
                  onClick={() => toggleSideBet(sb.key as any)}
                  style={{ 
                    padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                    border: (sideBets as any)[sb.key] > 0 ? '2px solid #ff00ff' : '1px solid rgba(255,255,255,0.3)',
                    background: (sideBets as any)[sb.key] > 0 ? 'rgba(255,0,255,0.2)' : 'transparent',
                    color: (sideBets as any)[sb.key] > 0 ? '#ffccff' : '#aaa'
                  }}
                >
                  {sb.label} {(sideBets as any)[sb.key] > 0 ? `($${(sideBets as any)[sb.key]})` : ''}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ color: '#d4af37', fontWeight: 'bold' }}>MAIN BET:</div>
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
              <button 
                className="btn-primary" 
                style={{ marginLeft: '16px', padding: '16px 32px', fontSize: '1.2rem', boxShadow: '0 0 15px rgba(212,175,55,0.4)' }} 
                onClick={() => handleAction(() => placeBet(tableId, betAmount, sideBets).then(() => checkAutoDeal(tableId)))} 
                disabled={isProcessing || user!.credits < betAmount}
              >
                PLACE BETS
              </button>
            </div>
          </div>
        )}
        
        {isBetting && myState && myState.status === 'READY' && (
          <div style={{ background: 'rgba(0,255,170,0.2)', padding: '16px', borderRadius: '16px', border: '1px solid #00ffaa', color: '#00ffaa', fontWeight: 'bold' }}>
            Bets locked. Waiting for players...
          </div>
        )}

        {isInsurance && myState && myState.status === 'PLAYING' && myState.insuranceBet === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(0,0,0,0.8)', padding: '16px', borderRadius: '16px', border: '2px solid #ffcc00' }}>
            <span style={{ color: '#fff', fontWeight: 'bold' }}>Dealer shows Ace. Buy Insurance? (${Math.floor(myState.hands[0].bet / 2)})</span>
            <button className="btn-primary" style={{ padding: '8px 16px' }} onClick={() => handleAction(() => buyInsurance(tableId))} disabled={isProcessing}>Buy Insurance</button>
            <button className="btn-secondary" style={{ padding: '8px 16px' }} onClick={() => handleAction(() => resolveInsurance(tableId))} disabled={isProcessing}>Skip</button>
          </div>
        )}

        {isPlaying && myState && activeHandId && (
          <div style={{ display: 'flex', gap: '12px', background: 'rgba(0,0,0,0.8)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.5)', backdropFilter: 'blur(5px)' }}>
            
            {/* Find active hand to check rules */}
            {(() => {
              const h = myState.hands.find(ha => ha.id === activeHandId)
              const canSplit = h && h.cards.length === 2 && h.cards[0].rank === h.cards[1].rank && myState.hands.length < 4
              const canDouble = h && h.cards.length === 2
              const canSurrender = h && h.cards.length === 2 && myState.hands.length === 1

              return (
                <>
                  <button className="btn-primary" style={{ background: '#0055ff', padding: '16px 24px', fontSize: '1.2rem', minWidth: '100px' }} onClick={() => handleAction(() => hit(tableId, activeHandId))} disabled={isProcessing}>
                    HIT
                  </button>
                  <button className="btn-primary" style={{ background: '#ff5500', padding: '16px 24px', fontSize: '1.2rem', minWidth: '100px' }} onClick={() => handleAction(() => stand(tableId, activeHandId))} disabled={isProcessing}>
                    STAND
                  </button>
                  {canDouble && (
                    <button className="btn-primary" style={{ background: '#00cc66', padding: '16px 24px', fontSize: '1.2rem', minWidth: '100px' }} onClick={() => handleAction(() => doubleDown(tableId, activeHandId))} disabled={isProcessing}>
                      DOUBLE
                    </button>
                  )}
                  {canSplit && (
                    <button className="btn-primary" style={{ background: '#9900ff', padding: '16px 24px', fontSize: '1.2rem', minWidth: '100px' }} onClick={() => handleAction(() => split(tableId, activeHandId))} disabled={isProcessing}>
                      SPLIT
                    </button>
                  )}
                  {canSurrender && (
                    <button className="btn-secondary" style={{ padding: '16px 24px', fontSize: '1.2rem', minWidth: '100px' }} onClick={() => handleAction(() => surrender(tableId, activeHandId))} disabled={isProcessing}>
                      SURRENDER
                    </button>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {isResolved && myState && (
          <div style={{ display: 'flex', gap: '16px', background: 'rgba(0,0,0,0.6)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.3)', backdropFilter: 'blur(5px)' }}>
            <button className="btn-primary" style={{ padding: '16px 32px', fontSize: '1.2rem', minWidth: '200px', ...(iAmReady ? { background: '#00a86b', opacity: 0.85, cursor: 'default' } : {}) }} onClick={() => handleAction(() => nextRound(tableId))} disabled={isProcessing || iAmReady}>
              {iAmReady ? 'READY ✓' : 'NEXT ROUND'}
            </button>
          </div>
        )}
      </div>

      {/* CHAT WINDOW */}
      <div style={{ position: 'absolute', bottom: '40px', right: '40px', width: '320px', height: '320px', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.8)', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.5)', boxShadow: '0 10px 30px rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 100, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, transparent 100%)', borderBottom: '1px solid rgba(212, 175, 55, 0.3)', fontWeight: 'bold', color: '#d4af37', fontSize: '0.9rem' }}>
          GAME LOG
        </div>
        
        <div ref={chatScrollRef} style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {chatHistory.map((msg, i) => (
            <div key={i} style={{ color: '#fff', fontSize: '0.85rem' }}>{msg}</div>
          ))}
        </div>

      </div>
    </div>
  )
}
