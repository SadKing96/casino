'use client'

import { useUser } from '@/context/UserContext'
import { getGlobalState, spinPiggies } from './actions'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

const INITIAL_GRID = [
  ['🎩', '💰', '💎', 'A', 'K'],
  ['Q', 'J', '10', '9', '🎩'],
  ['💰', '💎', 'A', 'K', 'Q']
]

const JACKPOT_REQ: Record<string, number> = { MINI: 2, MINOR: 2, MAXI: 3, SUPER: 4, MAJOR: 5, GRAND: 6 }
const JACKPOT_MULT: Record<string, number> = { MINI: 10, MINOR: 25, MAXI: 50, SUPER: 150, MAJOR: 300, GRAND: 2000 }

export default function PiggiesSlot() {
  const { user, updateBalances } = useUser()
  const [grid, setGrid] = useState<string[][]>(INITIAL_GRID)
  const [isSpinning, setIsSpinning] = useState(false)
  const [betAmount, setBetAmount] = useState(10)
  
  const [gameState, setGameState] = useState<any>(null)
  const [lastWin, setLastWin] = useState<number | null>(null)
  const [winningLines, setWinningLines] = useState<number[]>([])
  const [jackpotWins, setJackpotWins] = useState<string[]>([])
  const [mysteryReveals, setMysteryReveals] = useState<{r: number, c: number, symbol: string}[]>([])
  
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
        if (mounted && data) {
          setGlobalJackpots(data.jackpots)
          setActivePlayers(data.activePlayers)
          if (!gameState && data.piggyState) {
            setGameState(data.piggyState)
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
    setWinningLines([])
    setJackpotWins([])
    setMysteryReveals([])
    
    const spinInterval = setInterval(() => {
      setGrid(prev => prev.map(row => [...row].sort(() => 0.5 - Math.random())))
    }, 100)

    try {
      const result = await spinPiggies(betAmount)
      
      setTimeout(() => {
        clearInterval(spinInterval)
        
        // Show mysteries first if any
        if (result.mysteryReveals && result.mysteryReveals.length > 0) {
          // Replace with '?' for a moment
          const tempGrid = [...result.grid]
          result.mysteryReveals.forEach((m: any) => tempGrid[m.r][m.c] = '?')
          setGrid(tempGrid)
          
          setTimeout(() => {
            setGrid(result.grid)
            setMysteryReveals(result.mysteryReveals)
            
            setTimeout(() => {
              finishSpin(result)
            }, 800)
          }, 800)
        } else {
          setGrid(result.grid)
          finishSpin(result)
        }
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
    setWinningLines(result.winningLines)
    setJackpotWins(result.jackpotWins || [])
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
  const activeFeatures = JSON.parse(gameState.activeFeatures || '[]')
  const jackpotProgress = JSON.parse(gameState.jackpotProgress || '{}')

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
        backgroundImage: 'url(/images/piggy_vault.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: -1
      }} />

      {/* JACKPOTS (Massive Pyramid) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginBottom: '20px', width: '600px' }}>
        
        {/* Row 1: GRAND */}
        <div className="jackpot-block grand-block" style={{ width: '100%', animation: jackpotWins.includes('GRAND') ? 'pulse 0.5s infinite alternate' : 'none' }}>
          <div className="jackpot-amount">${(globalJackpots?.grand || JACKPOT_MULT['GRAND'] * betAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
          <div className="jackpot-label" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            GRAND 
            {activeFeatures.includes('YELLOW') && <span style={{ color: '#fff', background: '#000', padding: '2px 6px', borderRadius: '4px' }}>{jackpotProgress['GRAND'] || 0}/6</span>}
          </div>
        </div>

        {/* Row 2: MAJOR & SUPER */}
        <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
          <div className="jackpot-block" style={{ flex: 1, animation: jackpotWins.includes('MAJOR') ? 'pulse 0.5s infinite alternate' : 'none' }}>
            <div className="jackpot-amount">${(globalJackpots?.major || JACKPOT_MULT['MAJOR'] * betAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div className="jackpot-label" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              MAJOR
              {activeFeatures.includes('YELLOW') && <span style={{ color: '#fff', background: '#000', padding: '2px 6px', borderRadius: '4px' }}>{jackpotProgress['MAJOR'] || 0}/5</span>}
            </div>
          </div>
          <div className="jackpot-block" style={{ flex: 1, animation: jackpotWins.includes('SUPER') ? 'pulse 0.5s infinite alternate' : 'none' }}>
            <div className="jackpot-amount">${(globalJackpots?.super || JACKPOT_MULT['SUPER'] * betAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div className="jackpot-label" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              SUPER
              {activeFeatures.includes('YELLOW') && <span style={{ color: '#fff', background: '#000', padding: '2px 6px', borderRadius: '4px' }}>{jackpotProgress['SUPER'] || 0}/4</span>}
            </div>
          </div>
        </div>

        {/* Row 3: MAXI, MINOR, MINI */}
        <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
          <div className="jackpot-block" style={{ flex: 1, animation: jackpotWins.includes('MAXI') ? 'pulse 0.5s infinite alternate' : 'none' }}>
            <div className="jackpot-amount">${(globalJackpots?.maxi || JACKPOT_MULT['MAXI'] * betAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div className="jackpot-label" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              MAXI
              {activeFeatures.includes('YELLOW') && <span style={{ color: '#fff', background: '#000', padding: '2px 6px', borderRadius: '4px' }}>{jackpotProgress['MAXI'] || 0}/3</span>}
            </div>
          </div>
          <div className="jackpot-block" style={{ flex: 1, animation: jackpotWins.includes('MINOR') ? 'pulse 0.5s infinite alternate' : 'none' }}>
            <div className="jackpot-amount">${(globalJackpots?.minor || JACKPOT_MULT['MINOR'] * betAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div className="jackpot-label" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              MINOR
              {activeFeatures.includes('YELLOW') && <span style={{ color: '#fff', background: '#000', padding: '2px 6px', borderRadius: '4px' }}>{jackpotProgress['MINOR'] || 0}/2</span>}
            </div>
          </div>
          <div className="jackpot-block" style={{ flex: 1, animation: jackpotWins.includes('MINI') ? 'pulse 0.5s infinite alternate' : 'none' }}>
            <div className="jackpot-amount">${(globalJackpots?.mini || JACKPOT_MULT['MINI'] * betAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div className="jackpot-label" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              MINI
              {activeFeatures.includes('YELLOW') && <span style={{ color: '#fff', background: '#000', padding: '2px 6px', borderRadius: '4px' }}>{jackpotProgress['MINI'] || 0}/2</span>}
            </div>
          </div>
        </div>
      </div>

      {/* PIGGY METERS (Hovering Glass Jars) */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
        {/* BLUE PIG (Spins) */}
        <div className="pig-jar" style={{ borderColor: '#00aaff', boxShadow: activeFeatures.includes('BLUE') ? '0 0 30px #00aaff, inset 0 0 20px #00aaff' : 'none' }}>
          <motion.div animate={{ scale: 1 + (gameState.blueMeter * 0.005) }} style={{ fontSize: '3rem', filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.5))' }}>🐷</motion.div>
          <div className="pig-badge" style={{ background: '#00aaff' }}>{gameState.blueMeter}</div>
          <div style={{ fontSize: '0.6rem', color: '#00aaff', fontWeight: 'bold', marginTop: '4px', letterSpacing: '1px' }}>SPINS</div>
        </div>

        {/* YELLOW PIG (Jackpot) */}
        <div className="pig-jar" style={{ borderColor: '#ffcc00', boxShadow: activeFeatures.includes('YELLOW') ? '0 0 30px #ffcc00, inset 0 0 20px #ffcc00' : 'none' }}>
          <motion.div animate={{ scale: 1 + (gameState.yellowMeter * 0.05) }} style={{ fontSize: '3rem', filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.5))' }}>🐷</motion.div>
          <div style={{ fontSize: '0.6rem', color: '#ffcc00', fontWeight: 'bold', marginTop: '4px', letterSpacing: '1px' }}>JACKPOT</div>
        </div>

        {/* RED PIG (Wilds) */}
        <div className="pig-jar" style={{ borderColor: '#ff0055', boxShadow: activeFeatures.includes('RED') ? '0 0 30px #ff0055, inset 0 0 20px #ff0055' : 'none' }}>
          <motion.div animate={{ scale: 1 + (gameState.redMeter * 0.05) }} style={{ fontSize: '3rem', filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.5))' }}>🐷</motion.div>
          <div style={{ fontSize: '0.6rem', color: '#ff0055', fontWeight: 'bold', marginTop: '4px', letterSpacing: '1px' }}>WILDS</div>
        </div>
      </div>

      {/* FREE SPINS BANNER */}
      <AnimatePresence>
        {isFreeSpins && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{
              background: 'linear-gradient(90deg, #aa0000, #ff5500)',
              padding: '10px 40px', borderRadius: '30px', border: '3px solid #ffaa00',
              color: '#fff', fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '10px',
              boxShadow: '0 0 20px #ff5500', textShadow: '0 0 10px rgba(0,0,0,0.8)',
              display: 'flex', gap: '20px', alignItems: 'center'
            }}
          >
            <span>FREE SPINS: {gameState.freeSpinsRemaining}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {activeFeatures.includes('BLUE') && <span style={{ background: '#00aaff', padding: '2px 8px', borderRadius: '12px', fontSize: '1rem' }}>+SPINS</span>}
              {activeFeatures.includes('YELLOW') && <span style={{ background: '#ffcc00', padding: '2px 8px', borderRadius: '12px', fontSize: '1rem', color: '#000' }}>JACKPOTS</span>}
              {activeFeatures.includes('RED') && <span style={{ background: '#ff0055', padding: '2px 8px', borderRadius: '12px', fontSize: '1rem' }}>WILDS</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D SLOT MACHINE CONTAINER */}
      <div style={{ perspective: '1000px', marginBottom: '20px' }}>
        <div style={{
          transform: 'rotateX(5deg)',
          background: 'linear-gradient(180deg, rgba(20, 15, 10, 0.9) 0%, rgba(10, 5, 5, 0.9) 100%)',
          border: '4px solid #d4af37',
          boxShadow: '0 0 40px rgba(212, 175, 55, 0.5), inset 0 0 20px rgba(212, 175, 55, 0.3)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex', flexDirection: 'column', gap: '10px',
          width: '500px'
        }}>
          
          <div style={{ height: '30px', textAlign: 'center', color: '#ffcc00', fontWeight: 'bold', textShadow: '0 0 10px #ffcc00' }}>
             {lastWin !== null && lastWin > 0 && `WINNER! +$${lastWin.toLocaleString()}`}
             {jackpotWins.length > 0 && ` | WON JACKPOT: ${jackpotWins.join(', ')}`}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {grid.map((row, rIndex) => (
              <div key={rIndex} style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                {row.map((symbol, cIndex) => {
                  const isWinning = winningLines.includes(rIndex)
                  const isMystery = mysteryReveals.some(m => m.r === rIndex && m.c === cIndex)
                  
                  return (
                    <div key={cIndex} style={{
                      width: '80px', height: '80px', background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
                      borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '3.5rem', border: '1px solid #333',
                      boxShadow: isMystery ? '0 0 20px #00ffff, inset 0 0 20px #00ffff' : (isWinning ? 'inset 0 0 20px #ffaa00' : 'inset 0 0 15px #000'),
                      filter: isSpinning ? 'blur(5px) brightness(1.5)' : 'none',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}>
                      {symbol}
                      {/* Mystery Reveal Overlay */}
                      {isMystery && !isSpinning && (
                        <motion.div initial={{ opacity: 1, scale: 2 }} animate={{ opacity: 0, scale: 1 }} style={{ position: 'absolute', inset: 0, border: '4px solid #00ffff', borderRadius: '8px', pointerEvents: 'none' }} />
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
        border: '1px solid rgba(212, 175, 55, 0.4)', 
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
            border: '2px solid #ffcc00',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            color: '#ffcc00',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            boxShadow: '0 0 10px #ffcc00'
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
          boxShadow: 'inset 0 0 20px rgba(255, 200, 0, 0.2)',
          width: '100%'
        }}>
          <div style={{ color: '#d4af37', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>CREDIT</div>
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
            background: 'linear-gradient(180deg, #d4af37 0%, #8a6a1c 100%)',
            border: 'none',
            boxShadow: '0 0 30px rgba(212, 175, 55, 0.8), inset 0 0 20px #fff',
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
            background: 'linear-gradient(180deg, #ffcc00 0%, #aa7700 100%)',
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
        border: '1px solid rgba(212, 175, 55, 0.4)', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center',
        backdropFilter: 'blur(10px)',
        width: '200px',
        maxHeight: '400px',
        overflowY: 'auto',
        zIndex: 100
      }}>
        <h3 style={{ color: '#d4af37', margin: 0, textShadow: '0 0 10px #d4af37', textAlign: 'center', fontSize: '1rem' }}>ACTIVE PLAYERS</h3>
        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff', textShadow: '0 0 20px #fff' }}>{activePlayers.length}</div>
        <div style={{ width: '100%', height: '1px', background: 'rgba(212,175,55,0.2)' }} />
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
          {activePlayers.map((p, i) => (
            <li key={i} style={{ color: p === user.username ? '#d4af37' : '#aaa', fontWeight: p === user.username ? 'bold' : 'normal' }}>
              {p === user.username ? `${p} (You)` : p}
            </li>
          ))}
        </ul>
      </div>

      {/* Add specific CSS for pyramid blocks and glass jars */}
      <style dangerouslySetInnerHTML={{__html: `
        .pig-jar {
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid;
          border-radius: 40px;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          backdrop-filter: blur(10px);
          position: relative;
        }
        .pig-badge {
          position: absolute;
          top: -10px;
          right: -10px;
          color: #fff;
          font-weight: bold;
          font-size: 0.8rem;
          padding: 4px 8px;
          border-radius: 12px;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
        .jackpot-block {
          border: 3px solid #d4af37;
          background: linear-gradient(180deg, rgba(212,175,55,0.2) 0%, rgba(138,106,28,0.6) 100%);
          box-shadow: inset 0 0 20px rgba(212,175,55,0.5), 0 0 10px rgba(0,0,0,0.8);
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
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.05); opacity: 0.9; filter: brightness(1.5); }
        }
      `}} />
    </div>
  )
}
