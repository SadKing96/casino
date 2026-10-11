'use client'

import { useUser } from '@/context/UserContext'
import { getFrankensteinState, spinFrankenstein, getGlobalState, resetFrankensteinGame } from './actions'
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
  const { user, updateCredits } = useUser()
  const [grid, setGrid] = useState<string[][]>(INITIAL_GRID)
  const [isSpinning, setIsSpinning] = useState(false)
  const [winAmount, setWinAmount] = useState(0)
  const [lineWins, setLineWins] = useState<number[]>([])
  const [betAmount, setBetAmount] = useState(10)
  const [spinningReels, setSpinningReels] = useState<boolean[]>([false, false, false, false, false])
  const [showOverlay, setShowOverlay] = useState(false)
  
  const [gameState, setGameState] = useState<any>(null)
  const [persistentMultipliers, setPersistentMultipliers] = useState<number[]>(Array(15).fill(1))
  const [lastWin, setLastWin] = useState<number | null>(null)
  const [winningLines, setWinningLines] = useState<number[]>([])
  const [jackpotWon, setJackpotWon] = useState<string | null>(null)
  const [collectedPrizes, setCollectedPrizes] = useState<any[]>([])
  
  const [lightningSpreads, setLightningSpreads] = useState<{r: number, c: number}[]>([])
  const [fireSpreads, setFireSpreads] = useState<{r: number, c: number}[]>([])

  const [globalJackpots, setGlobalJackpots] = useState<any>(null)
  const [activePlayers, setActivePlayers] = useState<string[]>([])
  
  const [zoomScale, setZoomScale] = useState(1)

  useEffect(() => {
    const handleResize = () => {
      // Scale down if height is small
      const targetHeight = 1000 
      if (window.innerHeight < targetHeight) {
        setZoomScale(window.innerHeight / targetHeight)
      } else {
        setZoomScale(1)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Audio state
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(0.3)
  const isMutedRef = useRef(false)
  const volumeRef = useRef(0.3)
  const bgMusicRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    isMutedRef.current = isMuted
    volumeRef.current = volume
    if (bgMusicRef.current) {
      bgMusicRef.current.muted = isMuted
      bgMusicRef.current.volume = volume
    }
  }, [isMuted, volume])

  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    let tickInterval: NodeJS.Timeout;
    const isAnySpinning = spinningReels.some(r => r);
    
    if (isAnySpinning && !isMuted) {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) audioCtxRef.current = new AudioContext();
      }
      
      const playTick = () => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        try {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          // Simple Reverb using a short delay network
          const delay = ctx.createDelay();
          delay.delayTime.value = 0.04; // 40ms slapback
          const feedback = ctx.createGain();
          feedback.gain.value = 0.35; // 35% feedback tail
          
          delay.connect(feedback);
          feedback.connect(delay);
          delay.connect(ctx.destination);

          // Sine wave for a soft, clean 'plop', low pitched
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(150, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.05);

          gainNode.gain.setValueAtTime(volumeRef.current * 0.8, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          gainNode.connect(delay); // Send to reverb

          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.05);
        } catch (e) {}
      };
      
      tickInterval = setInterval(playTick, 90);
    }
    return () => clearInterval(tickInterval);
  }, [spinningReels, isMuted])

  useEffect(() => {
    // Initialize background music
    if (typeof window !== 'undefined') {
      bgMusicRef.current = new Audio('/audio/frankenstein_theme.mp3')
      bgMusicRef.current.loop = true
      bgMusicRef.current.volume = volumeRef.current
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
      .then(res => { 
        if (mounted && res) {
          setGameState(res.state)
          if (res.persistentMultipliers) setPersistentMultipliers(res.persistentMultipliers)
        } 
      })
      .catch(err => {
        console.error('Failed to load Frankenstein state:', err)
        if (mounted) setGameState({ error: true })
      })

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [user])

  const handleSpin = async (forceOptions?: { forceJackpot?: string, forceFreeSpins?: boolean }) => {
    setWinAmount(0)
    setLineWins([])
    setCollectedPrizes([])
    // If it's a click event passed by React, ignore it
    if (forceOptions && 'nativeEvent' in forceOptions) forceOptions = undefined;
    
    if (!user) return
    if (!gameState?.isFreeSpinMode && user.credits < betAmount) return
    
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
    setShowOverlay(false)
    setSpinningReels([true, true, true, true, true])
    try {
      const result = await spinFrankenstein(betAmount, forceOptions)
      
      setTimeout(() => {
        // Set the grid early so when reels stop they mount the correct symbol instead of old one
        setGrid(result.grid);

        // Stop reels sequentially
        [0, 1, 2, 3, 4].forEach(cIndex => {
          setTimeout(() => {
            setSpinningReels(prev => {
              const next = [...prev]
              next[cIndex] = false
              return next
            })
          }, cIndex * 200) // 200ms delay between each reel stopping
        })

        setTimeout(() => {
          setIsSpinning(false)
          updateCredits(result.newBalance)
          setLastWin(result.totalWin)
          setWinningLines(result.winningLines)
          setJackpotWon(result.jackpotWon)
          setCollectedPrizes(result.collectedPrizes || [])
          
          const hasBigEvent = result.jackpotWon || result.triggerFreeSpins || (result.collectedPrizes && result.collectedPrizes.length > 0)
          if (hasBigEvent) {
            setShowOverlay(true)
            setTimeout(() => {
              setShowOverlay(false)
            }, 2500)
          }

          // Trigger "It's alive!" audio if free spins are newly triggered
          if (!gameState?.isFreeSpinMode && result.newState.isFreeSpinMode) {
            if (!isMutedRef.current) {
              const itsAliveAudio = new Audio('/audio/its-alive_reverb.mp3')
              itsAliveAudio.volume = volumeRef.current
              itsAliveAudio.play().catch(console.error)
            }
          }
          
          setGameState(result.newState)
          setLightningSpreads(result.lightningSpreads || [])
          setFireSpreads(result.fireSpreads || [])
        }, 1000) // Wait 1 second after last reel stops before showing wins/features
      }, 1000) // Base spin duration before stopping sequence begins
    } catch (e) {
      setIsSpinning(false)
      setSpinningReels([false, false, false, false, false])
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
        zIndex: -1,
        transform: isFreeSpins ? 'scale(1.05)' : 'scale(1)',
        filter: isFreeSpins ? 'brightness(0.7) contrast(1.1) hue-rotate(15deg)' : 'brightness(0.8)',
        transition: 'all 2s ease-in-out'
      }} />

      {/* CYAN OVERLAY FOR FREE SPINS */}
      {isFreeSpins && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'cyan',
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
          zIndex: -1,
          animation: 'lightningFlash 3s infinite'
        }} />
      )}
      
      <div style={{
        zoom: zoomScale,
        display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%',
      }}>
      
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
          
          <div style={{ height: '30px', textAlign: 'center', color: '#ffcc00', fontWeight: '900', textShadow: '0 0 10px #ffaa00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <AnimatePresence>
               {!showOverlay && lastWin !== null && lastWin > 0 && !isSpinning && (
                 <motion.div
                   initial={{ scale: 0.5, opacity: 0, y: 10 }}
                   animate={{ scale: 1, opacity: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.8 }}
                   style={{ fontSize: '1.5rem', textTransform: 'uppercase', letterSpacing: '2px' }}
                 >
                   WINNER! +${lastWin.toLocaleString()}
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {grid.map((row, rIndex) => (
              <div key={rIndex} style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                {row.map((symbol, cIndex) => {
                  const isWinning = winningLines.includes(rIndex)
                  const isLightning = lightningSpreads.some(s => s.r === rIndex && s.c === cIndex)
                  const isFire = fireSpreads.some(s => s.r === rIndex && s.c === cIndex)
                  const isReelSpinning = spinningReels[cIndex]
                  
                  return (
                      <div key={cIndex} style={{
                        width: '80px', height: '80px', background: '#0a0a1a',
                        borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '3.5rem', border: '1px solid #333',
                        boxShadow: isLightning ? '0 0 20px #00ffff, inset 0 0 20px #00ffff' : (isFire ? '0 0 20px #ff5500, inset 0 0 20px #ff5500' : (isWinning ? '0 0 20px #ffcc00, inset 0 0 30px #ffaa00' : 'inset 0 0 15px #000')),
                        filter: isReelSpinning ? 'blur(2px) brightness(1.2)' : 'none',
                        transition: 'all 0.2s',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <motion.div
                          key={isReelSpinning ? 'spinning' : `stopped-${symbol}`}
                          initial={isReelSpinning ? { y: -80, scale: 1 } : { y: -50, opacity: 0, scale: 1 }}
                          animate={isReelSpinning ? { y: 80, scale: 1 } : { y: 0, opacity: 1, scale: isWinning && !isReelSpinning ? 1.25 : 1 }}
                          transition={isReelSpinning ? { repeat: Infinity, duration: 0.2, ease: 'linear' } : { type: 'spring', bounce: 0.6, duration: 0.6 }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', transformOrigin: 'center' }}
                        >
                          {symbol === 'BLUE' ? '⚡' : symbol === 'ORANGE' ? '🔥' : symbol === 'POWER' ? '🔋' : symbol === 'ALIVE' ? '🧟‍♂️' : symbol}
                        </motion.div>
                        {/* Winning Overlay */}
                        {isWinning && !isSpinning && (
                          <div style={{ position: 'absolute', inset: 0, border: '4px solid #ffcc00', borderRadius: '8px', opacity: 0.9, pointerEvents: 'none' }} />
                        )}
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
        {/* Admin Test Tools (Left side of deck) */}
        <div style={{
          position: 'absolute', right: '100%', top: '0', marginRight: '20px',
          background: 'rgba(0,0,0,0.8)', padding: '16px', borderRadius: '16px',
          border: '1px solid rgba(0, 255, 255, 0.3)', display: 'flex', flexDirection: 'column', gap: '12px',
          backdropFilter: 'blur(10px)', width: '200px', boxShadow: '0 0 20px rgba(0,0,0,0.5)'
        }}>
          <h4 style={{ margin: 0, color: '#00ffff', fontSize: '0.9rem', textAlign: 'center', textTransform: 'uppercase' }}>Admin Tools</h4>
          
          <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px' }} onClick={() => handleSpin({ forceFreeSpins: true })}>
            Force Free Spins
          </button>

          <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px', background: 'rgba(255,0,0,0.3)', borderColor: 'red' }} onClick={async () => {
             await resetFrankensteinGame();
             window.location.reload();
          }}>
            ⚠️ RESET GAME
          </button>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
             {['MINI', 'MINOR', 'MAXI', 'SUPER', 'MAJOR', 'GRAND'].map(jp => (
               <button key={jp} className="btn-secondary" style={{ fontSize: '0.6rem', padding: '4px' }} onClick={() => handleSpin({ forceJackpot: jp })}>
                 + {jp}
               </button>
             ))}
          </div>
        </div>

        {/* Audio Controls (Top Right of deck) */}
        <div style={{
            position: 'absolute',
            top: '-50px',
            right: '0',
            background: 'rgba(0,0,0,0.6)',
            border: '2px solid #00ffff',
            borderRadius: '25px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 0 10px #00ffff'
        }}>
          <button onClick={() => setIsMuted(prev => !prev)} style={{ background: 'none', border: 'none', color: '#00ffff', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}>
            {isMuted ? '🔇' : '🔊'}
          </button>
          <input 
            type="range" min="0" max="1" step="0.05" 
            value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{ width: '80px', accentColor: '#00ffff', cursor: 'pointer' }}
            title="Volume"
          />
        </div>

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
          <div style={{ color: '#fff', fontSize: '1.2rem', fontFamily: 'monospace', fontWeight: 'bold' }}>${user.credits.toLocaleString()}</div>
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
            cursor: (!isFreeSpins && user.credits < betAmount) || isSpinning ? 'not-allowed' : 'pointer',
            opacity: (!isFreeSpins && user.credits < betAmount) || isSpinning ? 0.5 : 1,
            position: 'relative',
            transform: isSpinning ? 'scale(0.95)' : 'scale(1)',
            transition: 'all 0.1s',
            marginTop: '8px'
          }}
          onClick={() => handleSpin()}
          disabled={isSpinning || (!isFreeSpins && user.credits < betAmount)}
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

      </div>

      {/* Add specific CSS for pyramid blocks */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes lightningFlash {
          0% { opacity: 0; }
          5% { opacity: 0.4; }
          10% { opacity: 0; }
          15% { opacity: 0.6; }
          20% { opacity: 0; }
          100% { opacity: 0; }
        }
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

      {/* FIXED MEGA OVERLAY FOR EVENTS */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 70%)',
          }}>
            <motion.div 
              initial={{ scale: 0.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.1, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.7, duration: 0.8 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textShadow: '0 0 20px #ffea00, 0 0 40px #ffaa00, 0 0 60px #ff5500, 0 0 80px #ff0000',
                padding: '50px',
                width: '100vw',
              }}
            >
              {/* Free Spins Trigger */}
              {gameState?.isFreeSpinMode && (
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  style={{ fontSize: '3.5rem', fontWeight: '900', color: '#00ffff', textShadow: '0 0 30px #00ffff', marginBottom: '20px', textTransform: 'uppercase' }}
                >
                  10 FREE SPINS WON!
                </motion.div>
              )}

              {/* Collected Prizes (Blue Boxes & Jackpots) */}
              {collectedPrizes.length > 0 && (
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {Object.values(collectedPrizes.reduce((acc, curr) => {
                    const key = curr.isJackpot ? curr.jackpotName : curr.prizeName;
                    if (!acc[key]) acc[key] = { ...curr, count: 1 };
                    else {
                      acc[key].amount += curr.amount;
                      acc[key].count += 1;
                    }
                    return acc;
                  }, {} as Record<string, any>)).map((p: any, i: number) => {
                    const isJackpot = p.isJackpot || !p.prizeName;
                    return (
                      <motion.div 
                        key={i}
                        initial={{ y: 50, opacity: 0, scale: 0.5 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.15, type: 'spring', bounce: 0.5 }}
                        style={{ 
                          background: isJackpot ? 'rgba(255, 60, 0, 0.8)' : 'rgba(0, 80, 200, 0.8)', 
                          padding: '16px 32px', 
                          borderRadius: '12px', 
                          color: '#fff', 
                          fontWeight: '900', 
                          fontSize: '2rem', 
                          border: isJackpot ? '4px solid #ffcc00' : '4px solid #00ffff', 
                          boxShadow: isJackpot ? '0 0 30px #ff5500, inset 0 0 20px #ffaa00' : '0 0 30px #00aaff, inset 0 0 20px #00ffff',
                          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        <span style={{ fontSize: '2.5rem' }}>{isJackpot ? '🔥' : '⚡'}</span>
                        <span>
                          {isJackpot ? `${p.jackpotName} JACKPOT!` : `STATIC PRIZE`} 
                          {p.count > 1 ? ` (x${p.count}) ` : ' '}
                          <span style={{ color: isJackpot ? '#ffea00' : '#00ffff' }}>+${p.amount.toLocaleString()}</span>
                        </span>
                      </motion.div>
                    )
                  })}
                </div>
              )}

              {/* Total Win Amount */}
              {lastWin !== null && lastWin > 0 && (
                <>
                  <motion.div 
                    animate={{ rotate: [0, -5, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    style={{ fontSize: '5rem', fontWeight: '900', color: '#ffea00', textTransform: 'uppercase', letterSpacing: '4px' }}
                  >
                    WINNER!
                  </motion.div>
                  <div style={{ fontSize: '8rem', fontWeight: '900', color: '#ffffff', textShadow: '0 0 40px #00ffff, 0 0 80px #0088ff' }}>
                    +${lastWin.toLocaleString()}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
