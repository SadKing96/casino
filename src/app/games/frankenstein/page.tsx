'use client'

import { useUser } from '@/context/UserContext'
import { getFrankensteinState, spinFrankenstein, getGlobalState } from './actions'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

const INITIAL_GRID = [
  ['🧟‍♂️', '⚡', '🧠', '🦇', '🧪'],
  ['🦇', '🧪', '💎', '🧟‍♂️', '⚡'],
  ['⚡', '🧠', '🦇', '🧪', '🧟‍♂️']
]

const JACKPOT_NAMES = ['MINI', 'MINOR', 'MAXI', 'SUPER', 'MAJOR', 'GRAND']
const JACKPOT_MULT: Record<string, number> = { MINI: 10, MINOR: 25, MAXI: 50, SUPER: 150, MAJOR: 300, GRAND: 2000 }

export default function FrankensteinSlot() {
  const { user, updateBalances } = useUser()
  const [grid, setGrid] = useState<string[][]>(INITIAL_GRID)
  const [isSpinning, setIsSpinning] = useState(false)
  const [betAmount, setBetAmount] = useState(10)
  
  const [gameState, setGameState] = useState<any>(null)
  const [lastWin, setLastWin] = useState<number | null>(null)
  const [winningLines, setWinningLines] = useState<number[]>([])
  const [jackpotWon, setJackpotWon] = useState<string | null>(null)
  
  const [lightningSpreads, setLightningSpreads] = useState<{r: number, c: number}[]>([])
  const [fireSpreads, setFireSpreads] = useState<{r: number, c: number}[]>([])

  const [globalJackpots, setGlobalJackpots] = useState<any>(null)
  const [activePlayers, setActivePlayers] = useState<string[]>([])

  // Audio state
  const [isMuted, setIsMuted] = useState(false)
  const isMutedRef = useRef(false)
  const bgMusicRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    isMutedRef.current = isMuted
    if (bgMusicRef.current) {
      bgMusicRef.current.muted = isMuted
    }
  }, [isMuted])

  useEffect(() => {
    // Initialize background music
    if (typeof window !== 'undefined') {
      bgMusicRef.current = new Audio('/audio/bg_music.mp3')
      bgMusicRef.current.loop = true
      bgMusicRef.current.volume = 0.3
    }
    
    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause()
        bgMusicRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!user) return
    let mounted = true

    const fetchGlobal = () => {
      getGlobalState().then(data => {
        if (mounted) {
          setGlobalJackpots(data.jackpots)
          setActivePlayers(data.activePlayers)
        }
      }).catch(console.error)
    }

    fetchGlobal()
    const interval = setInterval(fetchGlobal, 3000)

    getFrankensteinState()
      .then(state => { if (mounted) setGameState(state) })
      .catch(err => {
        console.error('Failed to load Frankenstein state:', err)
        if (mounted) setGameState({ error: true })
      })

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [user])

  const handleSpin = async () => {
    if (!user) return
    if (!gameState?.isFreeSpinMode && user.chipBalance < betAmount) return
    
    // Play background music on first interaction if not playing
    if (bgMusicRef.current && bgMusicRef.current.paused && !isMutedRef.current) {
      bgMusicRef.current.play().catch(console.error)
    }

    setIsSpinning(true)
    setLastWin(null)
    setWinningLines([])
    setJackpotWon(null)
    setLightningSpreads([])
    setFireSpreads([])
    
    const spinInterval = setInterval(() => {
      setGrid(prev => prev.map(row => [...row].sort(() => 0.5 - Math.random())))
    }, 100)

    try {
      const result = await spinFrankenstein(betAmount)
      
      setTimeout(() => {
        clearInterval(spinInterval)
        setGrid(result.grid)
        updateBalances(result.newBalance, user.bankBalance)
        setLastWin(result.totalWin)
        setWinningLines(result.winningLines)
        setJackpotWon(result.jackpotWon)
        
        // Trigger "It's alive!" audio if free spins are newly triggered
        if (!gameState?.isFreeSpinMode && result.newState.isFreeSpinMode) {
          if ('speechSynthesis' in window && !isMutedRef.current) {
            const msg = new SpeechSynthesisUtterance("It's alive!");
            msg.pitch = 0.2; // Deeper, monster-like voice
            msg.rate = 0.8;
            window.speechSynthesis.speak(msg);
          }
        }
        
        setGameState(result.newState)
        setLightningSpreads(result.lightningSpreads || [])
        setFireSpreads(result.fireSpreads || [])
        
        setTimeout(() => setIsSpinning(false), 1500)
      }, 1500)
    } catch (e) {
      clearInterval(spinInterval)
      setIsSpinning(false)
      console.error(e)
    }
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <h2 style={{ marginBottom: '16px' }}>Please login to play</h2>
        <Link href="/" className="btn-primary">Return to Lobby</Link>
      </div>
    )
  }

  if (!gameState) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Loading...</div>
  if (gameState.error) return <div style={{ textAlign: 'center', marginTop: '100px', color: 'red' }}>Error loading game state. Please refresh.</div>

  const isFreeSpins = gameState.isFreeSpinMode
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      justifyContent: 'space-evenly',
      height: 'calc(100vh - 100px)',
      paddingBottom: '20px'
    }}>
      {/* FULL SCREEN BACKGROUND */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url(/images/haunted_house.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: -1
      }} />
      
      {/* JACKPOT & PYRAMID DISPLAY */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginBottom: '20px', width: '600px' }}>
        
        {/* Row 1: GRAND */}
        <div className="jackpot-block grand-block" style={{ width: '100%', animation: jackpotWon === 'GRAND' ? 'pulse 0.5s infinite alternate' : 'none' }}>
          <div className="jackpot-amount">${(globalJackpots?.grand || JACKPOT_MULT['GRAND'] * betAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
          <div className="jackpot-label">GRAND</div>
        </div>

        {/* Row 2: SUPER & MAJOR */}
        <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
          <div className="jackpot-block" style={{ flex: 1, animation: jackpotWon === 'SUPER' ? 'pulse 0.5s infinite alternate' : 'none' }}>
            <div className="jackpot-amount">${(globalJackpots?.super || JACKPOT_MULT['SUPER'] * betAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div className="jackpot-label">SUPER</div>
          </div>
          <div className="jackpot-block" style={{ flex: 1, animation: jackpotWon === 'MAJOR' ? 'pulse 0.5s infinite alternate' : 'none' }}>
            <div className="jackpot-amount">${(globalJackpots?.major || JACKPOT_MULT['MAJOR'] * betAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div className="jackpot-label">MAJOR</div>
          </div>
        </div>

        {/* Row 3: MAXI, MINOR, MINI */}
        <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
          <div className="jackpot-block" style={{ flex: 1, animation: jackpotWon === 'MAXI' ? 'pulse 0.5s infinite alternate' : 'none' }}>
            <div className="jackpot-amount">${(globalJackpots?.maxi || JACKPOT_MULT['MAXI'] * betAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div className="jackpot-label">MAXI</div>
          </div>
          <div className="jackpot-block" style={{ flex: 1, animation: jackpotWon === 'MINOR' ? 'pulse 0.5s infinite alternate' : 'none' }}>
            <div className="jackpot-amount">${(globalJackpots?.minor || JACKPOT_MULT['MINOR'] * betAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div className="jackpot-label">MINOR</div>
          </div>
          <div className="jackpot-block" style={{ flex: 1, animation: jackpotWon === 'MINI' ? 'pulse 0.5s infinite alternate' : 'none' }}>
            <div className="jackpot-amount">${(globalJackpots?.mini || JACKPOT_MULT['MINI'] * betAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div className="jackpot-label">MINI</div>
          </div>
        </div>

        {/* PYRAMID NUMBERS DISPLAY */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          {[1000, 500, 300].map(n => <div key={n} className="pyramid-block">{n}</div>)}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[200, 150, 120].map(n => <div key={n} className="pyramid-block">{n}</div>)}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[100, 80, 60].map(n => <div key={n} className="pyramid-block">{n}</div>)}
        </div>
      </div>

      {/* MULTIPLIER / FREE SPINS STATUS */}
      <AnimatePresence>
        {isFreeSpins && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{
              background: 'linear-gradient(90deg, #aa0000, #ff5500)',
              padding: '10px 40px', borderRadius: '30px', border: '3px solid #ffaa00',
              color: '#fff', fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '10px',
              boxShadow: '0 0 20px #ff5500', textShadow: '0 0 10px rgba(0,0,0,0.8)'
            }}
          >
            FREE SPINS: {gameState.freeSpinsRemaining} | MULTIPLIER: {gameState.currentMultiplier}X
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D SLOT MACHINE CONTAINER */}
      <div style={{ perspective: '1000px', marginBottom: '20px' }}>
        <div style={{
          transform: 'rotateX(5deg)',
          background: 'rgba(0, 0, 20, 0.8)',
          border: '4px solid #00aaff',
          boxShadow: '0 0 40px #0055ff, inset 0 0 20px #00aaff',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex', flexDirection: 'column', gap: '10px',
          width: '500px'
        }}>
          
          <div style={{ height: '30px', textAlign: 'center', color: '#00aaff', fontWeight: 'bold', textShadow: '0 0 10px #00aaff' }}>
             {lastWin !== null && lastWin > 0 && `WINNER! +$${lastWin.toLocaleString()}`}
             {jackpotWon && ` | WON ${jackpotWon} JACKPOT!`}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {grid.map((row, rIndex) => (
              <div key={rIndex} style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                {row.map((symbol, cIndex) => {
                  const isWinning = winningLines.includes(rIndex)
                  const isLightning = lightningSpreads.some(s => s.r === rIndex && s.c === cIndex)
                  const isFire = fireSpreads.some(s => s.r === rIndex && s.c === cIndex)
                  
                  return (
                    <div key={cIndex} style={{
                      width: '80px', height: '80px', background: '#0a0a1a',
                      borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '3.5rem', border: '1px solid #333',
                      boxShadow: isLightning ? '0 0 20px #00ffff, inset 0 0 20px #00ffff' : (isFire ? '0 0 20px #ff5500, inset 0 0 20px #ff5500' : (isWinning ? 'inset 0 0 20px #00aaff' : 'inset 0 0 15px #000')),
                      filter: isSpinning ? 'blur(5px) brightness(1.5)' : 'none',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}>
                      {symbol}
                      {/* Lightning Overlay */}
                      {isLightning && !isSpinning && (
                        <div style={{ position: 'absolute', inset: 0, border: '4px solid #00ffff', borderRadius: '8px', opacity: 0.8, pointerEvents: 'none' }} />
                      )}
                      {/* Fire Overlay */}
                      {isFire && !isSpinning && (
                        <div style={{ position: 'absolute', inset: 0, border: '4px solid #ff5500', borderRadius: '8px', opacity: 0.8, pointerEvents: 'none' }} />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BUTTON DECK (Vertical floating on the right side) */}
      <div style={{ 
        position: 'fixed',
        right: '40px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(0,0,0,0.8)', padding: '16px', borderRadius: '24px',
        border: '1px solid rgba(0, 255, 255, 0.2)', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        backdropFilter: 'blur(10px)',
        zIndex: 100
      }}>
        {/* Mute Button */}
        <button
          onClick={() => setIsMuted(prev => !prev)}
          style={{
            position: 'absolute',
            top: '-40px',
            right: '0',
            background: 'rgba(0,0,0,0.6)',
            border: '2px solid #00ffff',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            color: '#00ffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            boxShadow: '0 0 10px #00ffff'
          }}
          title={isMuted ? "Unmute Audio" : "Mute Audio"}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>

        {/* TOP: Mini Display */}
        <div style={{
          background: '#000',
          border: '2px solid #333',
          borderRadius: '8px',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          boxShadow: 'inset 0 0 20px rgba(0, 100, 255, 0.2)',
          width: '100%'
        }}>
          <div style={{ color: '#00aaff', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>CREDIT</div>
          <div style={{ color: '#fff', fontSize: '1.2rem', fontFamily: 'monospace', fontWeight: 'bold' }}>${user.chipBalance.toLocaleString()}</div>
        </div>

        {/* CENTER: Bet Buttons (3x2 grid) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[10, 50, 100, 200, 500, 1000].map((amount, idx) => {
            const colors = ['#00ffff', '#ff00ff', '#00ff00', '#ffff00', '#ff5500', '#ff0055']
            const c = colors[idx]
            const isSelected = betAmount === amount
            return (
              <button 
                key={amount}
                style={{
                  width: '70px', height: '70px',
                  borderRadius: '12px',
                  background: isSelected ? `linear-gradient(180deg, ${c}40 0%, ${c}10 100%)` : 'linear-gradient(180deg, #333 0%, #111 100%)',
                  border: `2px solid ${isSelected ? c : '#444'}`,
                  boxShadow: isSelected ? `0 0 15px ${c}80, inset 0 0 15px ${c}40` : '0 5px 10px rgba(0,0,0,0.5)',
                  color: isSelected ? '#fff' : '#aaa',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: (isSpinning || isFreeSpins) ? 'not-allowed' : 'pointer',
                  opacity: (isSpinning || isFreeSpins) ? 0.5 : 1,
                  transition: 'all 0.2s',
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                }}
                onClick={() => setBetAmount(amount)}
                disabled={isSpinning || isFreeSpins}
              >
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: isSelected ? c : '#aaa', textShadow: isSelected ? `0 0 5px ${c}` : 'none' }}>BET</span>
                <span style={{ fontSize: amount >= 1000 ? '1.1rem' : '1.4rem', fontWeight: '900', textShadow: isSelected ? '0 0 10px #fff' : 'none', lineHeight: '1.2' }}>{amount}</span>
                <span style={{ fontSize: '0.5rem', fontWeight: 'bold', opacity: 0.8 }}>CREDITS</span>
              </button>
            )
          })}
        </div>

        {/* BOTTOM: Spin Button (Physical style) */}
        <button 
          style={{ 
            width: '120px', height: '100px',
            borderRadius: '40% 40% 50% 50%',
            clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
            background: 'linear-gradient(180deg, #0088ff 0%, #0022aa 100%)',
            border: 'none',
            boxShadow: '0 0 30px #00aaff, inset 0 0 20px #00ffff',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: (!isFreeSpins && user.chipBalance < betAmount) || isSpinning ? 'not-allowed' : 'pointer',
            opacity: (!isFreeSpins && user.chipBalance < betAmount) || isSpinning ? 0.5 : 1,
            position: 'relative',
            transform: isSpinning ? 'scale(0.95)' : 'scale(1)',
            transition: 'all 0.1s',
            marginTop: '8px'
          }}
          onClick={handleSpin}
          disabled={isSpinning || (!isFreeSpins && user.chipBalance < betAmount)}
        >
          {/* Inner metallic ring */}
          <div style={{
            position: 'absolute', inset: '5px',
            clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
            background: 'linear-gradient(180deg, #00aaff 0%, #0044ff 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'inset 0 0 20px #000'
          }}>
             <span style={{ fontSize: '1.5rem', fontWeight: '900', textShadow: '0 0 10px #fff, 2px 2px 0 #000', letterSpacing: '2px', marginTop: '8px' }}>
               {isSpinning ? '...' : (isFreeSpins ? 'FREE' : 'PLAY')}
             </span>
          </div>
        </button>
      </div>

      {/* ACTIVE PLAYERS (Floating on the left side) */}
      <div style={{ 
        position: 'fixed',
        left: '40px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(0,0,0,0.8)', padding: '24px', borderRadius: '24px',
        border: '1px solid rgba(0, 255, 255, 0.2)', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center',
        backdropFilter: 'blur(10px)',
        width: '200px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        <h3 style={{ color: '#00ffff', margin: 0, textShadow: '0 0 10px #00ffff', textAlign: 'center', fontSize: '1rem' }}>ACTIVE PLAYERS</h3>
        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff', textShadow: '0 0 20px #fff' }}>{activePlayers.length}</div>
        <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.2)' }} />
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
          {activePlayers.map((p, i) => (
            <li key={i} style={{ color: p === user.username ? '#00ffff' : '#aaa', fontWeight: p === user.username ? 'bold' : 'normal' }}>
              {p === user.username ? `${p} (You)` : p}
            </li>
          ))}
        </ul>
      </div>

      {/* Add specific CSS for pyramid blocks */}
      <style dangerouslySetInnerHTML={{__html: `
        .jackpot-block {
          border: 3px solid #ffaa00;
          background: linear-gradient(180deg, rgba(255,100,0,0.2) 0%, rgba(200,0,0,0.6) 100%);
          box-shadow: inset 0 0 20px rgba(255,100,0,0.5), 0 0 10px rgba(255,50,0,0.8);
          text-align: center;
          padding: 4px 10px;
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          clip-path: polygon(5% 0, 95% 0, 100% 100%, 0% 100%);
        }
        .grand-block {
          padding: 8px;
          background: linear-gradient(180deg, rgba(255,200,0,0.3) 0%, rgba(255,50,0,0.8) 100%);
          border-color: #ffcc00;
          box-shadow: inset 0 0 30px rgba(255,200,0,0.6), 0 0 20px #ff5500;
        }
        .jackpot-amount {
          color: #ffcc00;
          font-weight: 900;
          font-size: 1.4rem;
          text-shadow: 0 0 10px #ff0000, 2px 2px 0px #000;
          line-height: 1.1;
        }
        .grand-block .jackpot-amount {
          font-size: 2.6rem;
          text-shadow: 0 0 20px #ffaa00, 3px 3px 0px #000;
        }
        .jackpot-label {
          color: #fff;
          font-size: 0.8rem;
          letter-spacing: 2px;
          opacity: 0.9;
          text-shadow: 1px 1px 2px #000;
          margin-top: 2px;
          font-family: 'Courier New', Courier, monospace;
          font-weight: bold;
        }
        .pyramid-block {
          border: 2px solid #00aaff;
          color: #00aaff;
          font-size: 1.6rem;
          font-weight: bold;
          padding: 8px 36px;
          background: rgba(0, 40, 100, 0.6);
          box-shadow: 0 0 10px #00aaff, inset 0 0 10px #0055ff;
          text-shadow: 0 0 5px #00aaff;
          clip-path: polygon(10% 0, 90% 0, 100% 100%, 0% 100%);
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.05); opacity: 0.9; filter: brightness(1.5); }
        }
      `}} />
    </div>
  )
}
