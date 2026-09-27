'use client'

import { useUser } from '@/context/UserContext'
import { getBuffaloState, spinBuffalo } from './actions'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

const INITIAL_GRID = [
  ['🦬', 'A', 'K', 'Q', '🦬'],
  ['🦬', '🌅', '🐺', '🌅', '🦬'],
  ['🦬', '🦅', '🦌', '🦅', '🦬'],
  ['🦬', 'J', '10', '9', '🦬']
]

export default function BuffaloSlot() {
  const { user, updateBalances } = useUser()
  const [grid, setGrid] = useState<string[][]>(INITIAL_GRID)
  const [isSpinning, setIsSpinning] = useState(false)
  const [betAmount, setBetAmount] = useState(10)
  
  const [gameState, setGameState] = useState<any>(null)
  const [lastWin, setLastWin] = useState<number | null>(null)
  const [winningWays, setWinningWays] = useState<any[]>([])
  const [wildMultipliers, setWildMultipliers] = useState<Record<string, number>>({})
  
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
      getBuffaloState().then(data => {
        if (mounted && data) {
          setActivePlayers(data.activePlayers)
          if (!gameState && data.buffaloState) {
            setGameState(data.buffaloState)
          }
        }
      }).catch(err => {
        console.error(err)
        if (mounted && !gameState) setGameState({ error: true })
      })
    }

    fetchGlobal()
    const interval = setInterval(fetchGlobal, 3000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [user, gameState])

  const handleSpin = async () => {
    if (!user) return
    if (!gameState?.isFreeSpinMode && user.chipBalance < betAmount) return
    
    // Play background music on first interaction if not playing
    if (bgMusicRef.current && bgMusicRef.current.paused && !isMutedRef.current) {
      bgMusicRef.current.play().catch(console.error)
    }

    setIsSpinning(true)
    setLastWin(null)
    setWinningWays([])
    setWildMultipliers({})
    
    const spinInterval = setInterval(() => {
      setGrid(prev => prev.map(row => [...row].sort(() => 0.5 - Math.random())))
    }, 100)

    try {
      const result = await spinBuffalo(betAmount)
      
      setTimeout(() => {
        clearInterval(spinInterval)
        setGrid(result.grid)
        setWildMultipliers(result.wildMultipliers)
        finishSpin(result)
      }, 1500)
    } catch (e) {
      clearInterval(spinInterval)
      setIsSpinning(false)
      console.error(e)
    }
  }

  const finishSpin = (result: any) => {
    updateBalances(result.newBalance, user!.bankBalance)
    setLastWin(result.totalWin)
    setWinningWays(result.winningWays)
    setGameState(result.newState)
    setTimeout(() => setIsSpinning(false), 1000)
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
  if (gameState.error) return <div style={{ textAlign: 'center', marginTop: '100px', color: 'red' }}>Error loading game state. Please try refreshing the page.</div>

  const isFreeSpins = gameState.isFreeSpinMode

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      justifyContent: 'center',
      height: 'calc(100vh - 100px)',
      paddingBottom: '20px'
    }}>
      {/* FULL SCREEN BACKGROUND */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url(/images/buffalo_bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: -1
      }} />

      {/* GAME LOGO */}
      <div style={{ marginBottom: '20px' }}>
         <h1 style={{ 
            fontSize: '4.5rem', 
            fontWeight: '900', 
            background: 'linear-gradient(180deg, #ffcc00 0%, #ff5500 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.8))',
            margin: 0,
            letterSpacing: '2px',
            textTransform: 'uppercase'
         }}>BUFFALO KING</h1>
         <div style={{ textAlign: 'center', color: '#ffcc00', fontWeight: 'bold', letterSpacing: '4px', textShadow: '0 0 10px #000' }}>1024 WAYS TO WIN</div>
      </div>

      {/* FREE SPINS BANNER */}
      <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AnimatePresence>
          {isFreeSpins && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{
                background: 'linear-gradient(90deg, #550000, #aa0000)',
                padding: '10px 40px', borderRadius: '30px', border: '3px solid #ffcc00',
                color: '#fff', fontWeight: 'bold', fontSize: '1.5rem',
                boxShadow: '0 0 30px #ff0000, inset 0 0 20px #ff5500', 
                textShadow: '0 0 10px rgba(0,0,0,0.8)',
                display: 'flex', gap: '20px', alignItems: 'center'
              }}
            >
              <span>FREE SPINS: {gameState.freeSpinsRemaining}</span>
              <span style={{ fontSize: '1rem', color: '#ffcc00' }}>MULTIPLYING WILDS (2X / 3X)</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3D SLOT MACHINE CONTAINER */}
      <div style={{ perspective: '1000px', marginBottom: '20px', marginTop: '10px' }}>
        <div style={{
          transform: 'rotateX(5deg)',
          background: 'linear-gradient(180deg, rgba(30, 10, 0, 0.95) 0%, rgba(10, 0, 0, 0.95) 100%)',
          border: '6px solid #b87333',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), inset 0 0 30px rgba(255, 150, 0, 0.2)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex', flexDirection: 'column', gap: '10px',
          width: '600px'
        }}>
          
          <div style={{ height: '30px', textAlign: 'center', color: '#ffcc00', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 0 10px #ffcc00' }}>
             {lastWin !== null && lastWin > 0 && `BIG WIN! +$${lastWin.toLocaleString()}`}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {grid.map((row, rIndex) => (
              <div key={rIndex} style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {row.map((symbol, cIndex) => {
                  const isWinningSymbol = winningWays.some(w => w.symbol === symbol || (symbol === '🌅' && w.length > cIndex))
                  const mult = wildMultipliers[`${rIndex},${cIndex}`]
                  
                  return (
                    <div key={cIndex} style={{
                      width: '90px', height: '90px', background: 'linear-gradient(180deg, #1a1005 0%, #0a0500 100%)',
                      borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '4rem', border: '2px solid #4a2a10',
                      boxShadow: isWinningSymbol && !isSpinning ? '0 0 20px #ff5500, inset 0 0 20px #ffaa00' : 'inset 0 0 15px #000',
                      filter: isSpinning ? 'blur(5px) brightness(1.5)' : 'none',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}>
                      {symbol}
                      {/* Wild Multiplier Overlay */}
                      {symbol === '🌅' && mult && !isSpinning && (
                        <motion.div 
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          style={{ 
                            position: 'absolute', bottom: '-10px', right: '-10px', 
                            background: '#ff0000', color: '#fff', border: '2px solid #ffcc00',
                            borderRadius: '50%', width: '40px', height: '40px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '900', fontSize: '1.2rem', boxShadow: '0 0 10px #ffcc00',
                            textShadow: '1px 1px 0 #000'
                          }}
                        >
                          {mult}X
                        </motion.div>
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
        position: 'fixed', right: '40px', top: '50%', transform: 'translateY(-50%)',
        background: 'rgba(0,0,0,0.8)', padding: '16px', borderRadius: '24px',
        border: '1px solid rgba(255, 100, 0, 0.4)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '16px', backdropFilter: 'blur(10px)', zIndex: 100
      }}>
        {/* Mute Button */}
        <button
          onClick={() => setIsMuted(prev => !prev)}
          style={{
            position: 'absolute',
            top: '-40px',
            right: '0',
            background: 'rgba(0,0,0,0.6)',
            border: '2px solid #ffaa00',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            color: '#ffaa00',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            boxShadow: '0 0 10px #ffaa00'
          }}
          title={isMuted ? "Unmute Audio" : "Mute Audio"}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>

        {/* TOP: Mini Display */}
        <div style={{
          background: '#000', border: '2px solid #333', borderRadius: '8px', padding: '8px 12px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
          boxShadow: 'inset 0 0 20px rgba(255, 100, 0, 0.2)', width: '100%'
        }}>
          <div style={{ color: '#ffaa00', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>CREDIT</div>
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
                  width: '70px', height: '70px', borderRadius: '12px',
                  background: isSelected ? `linear-gradient(180deg, ${c}40 0%, ${c}10 100%)` : 'linear-gradient(180deg, #333 0%, #111 100%)',
                  border: `2px solid ${isSelected ? c : '#444'}`,
                  boxShadow: isSelected ? `0 0 15px ${c}80, inset 0 0 15px ${c}40` : '0 5px 10px rgba(0,0,0,0.5)',
                  color: isSelected ? '#fff' : '#aaa',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: (isSpinning || isFreeSpins) ? 'not-allowed' : 'pointer',
                  opacity: (isSpinning || isFreeSpins) ? 0.5 : 1, transition: 'all 0.2s',
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
            width: '120px', height: '100px', borderRadius: '40% 40% 50% 50%',
            clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
            background: 'linear-gradient(180deg, #ff8800 0%, #883300 100%)', border: 'none',
            boxShadow: '0 0 30px rgba(255, 100, 0, 0.8), inset 0 0 20px #fff', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: (!isFreeSpins && user.chipBalance < betAmount) || isSpinning ? 'not-allowed' : 'pointer',
            opacity: (!isFreeSpins && user.chipBalance < betAmount) || isSpinning ? 0.5 : 1,
            position: 'relative', transform: isSpinning ? 'scale(0.95)' : 'scale(1)',
            transition: 'all 0.1s', marginTop: '8px'
          }}
          onClick={handleSpin}
          disabled={isSpinning || (!isFreeSpins && user.chipBalance < betAmount)}
        >
          <div style={{
            position: 'absolute', inset: '5px', clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
            background: 'linear-gradient(180deg, #ffaa00 0%, #aa5500 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 20px #000'
          }}>
             <span style={{ fontSize: '1.5rem', fontWeight: '900', textShadow: '0 0 10px #fff, 2px 2px 0 #000', letterSpacing: '2px', marginTop: '8px' }}>
               {isSpinning ? '...' : (isFreeSpins ? 'FREE' : 'PLAY')}
             </span>
          </div>
        </button>
      </div>

      {/* ACTIVE PLAYERS (Floating on the left side) */}
      <div style={{ 
        position: 'fixed', left: '40px', top: '50%', transform: 'translateY(-50%)',
        background: 'rgba(0,0,0,0.8)', padding: '24px', borderRadius: '24px',
        border: '1px solid rgba(255, 100, 0, 0.4)', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center',
        backdropFilter: 'blur(10px)', width: '200px', maxHeight: '400px', overflowY: 'auto', zIndex: 100
      }}>
        <h3 style={{ color: '#ffaa00', margin: 0, textShadow: '0 0 10px #ffaa00', textAlign: 'center', fontSize: '1rem' }}>ACTIVE PLAYERS</h3>
        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff', textShadow: '0 0 20px #fff' }}>{activePlayers.length}</div>
        <div style={{ width: '100%', height: '1px', background: 'rgba(255,100,0,0.2)' }} />
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
          {activePlayers.map((p, i) => (
            <li key={i} style={{ color: p === user.username ? '#ffaa00' : '#aaa', fontWeight: p === user.username ? 'bold' : 'normal' }}>
              {p === user.username ? `${p} (You)` : p}
            </li>
          ))}
        </ul>
      </div>

    </div>
  )
}
