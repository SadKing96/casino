'use client'

import { useUser } from '@/context/UserContext'
import { getTableState, placeBet, spinWheel } from './actions'
import { RouletteBet, RouletteBetType, ALL_NUMBERS, getNumberColor } from './utils'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function RouletteTableUI({ tableId, onLeave }: { tableId: string, onLeave: () => void }) {
  const { user } = useUser()
  const [gameState, setGameState] = useState<any>(null)
  const [selectedChip, setSelectedChip] = useState<number>(5)
  const [isProcessing, setIsProcessing] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [spinResult, setSpinResult] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Traditional wheel animation state
  const [wheelRotation, setWheelRotation] = useState(0)

  // Standard wheel sequence for American Roulette
  const WHEEL_SEQUENCE = ['0', '28', '9', '26', '30', '11', '7', '20', '32', '17', '5', '22', '34', '15', '3', '24', '36', '13', '1', '00', '27', '10', '25', '29', '12', '8', '19', '31', '18', '6', '21', '33', '16', '4', '23', '35', '14', '2']
  const sliceAngle = 360 / 38

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, 1000)
    return () => clearInterval(interval)
  }, [tableId])

  const fetchState = async () => {
    if (spinning) return // Don't interrupt spin animation with fresh state
    try {
      const state = await getTableState(tableId)
      setGameState(state)
    } catch (e) {
      console.error(e)
    }
  }

  const handleBet = async (type: RouletteBetType) => {
    if (!user || isProcessing || gameState?.status !== 'BETTING' || spinning) return
    setIsProcessing(true)
    setErrorMsg('')
    try {
      await placeBet(tableId, type, selectedChip)
      await fetchState()
    } catch (e: any) {
      setErrorMsg(e.message)
      setTimeout(() => setErrorMsg(''), 3000)
    }
    setIsProcessing(false)
  }

  const handleSpin = async () => {
    if (!user || isProcessing || spinning) return
    setIsProcessing(true)
    setSpinning(true)
    
    try {
      const result = await spinWheel(tableId)
      
      const winNum = result.winningNumber
      if (winNum) {
        const idx = WHEEL_SEQUENCE.indexOf(winNum)
        
        // We want the winning slice (center of it) to land at the TOP (0 degrees).
        // Since the slice is at `idx * sliceAngle + sliceAngle / 2`,
        // rotating it to the top requires moving it BACKWARDS by that amount.
        // We add multiple 360 degree spins for suspense.
        const baseOffset = (idx * sliceAngle) + (sliceAngle / 2)
        const targetRotation = (8 * 360) - baseOffset
        
        setSpinResult(null)
        // Reset to 0 rotation quickly without animation if we were previously spun
        // Actually, appending rotation is smoother. Let's keep adding to the existing rotation so it only goes forward.
        setWheelRotation(prev => {
          const currentSpins = Math.floor(prev / 360)
          return ((currentSpins + 5) * 360) - baseOffset
        })

        // Spin takes 2.5 seconds
        setTimeout(() => {
          setSpinResult(winNum)
          setGameState(result) // Update board to show winnings
          
          setTimeout(() => {
            setSpinning(false)
            setSpinResult(null)
          }, 3000)
          
        }, 2500)
      }
    } catch (e: any) {
      console.error(e)
      setSpinning(false)
    }
    setIsProcessing(false)
  }

  if (!gameState) return <div style={{ textAlign: 'center', marginTop: '100px', color: '#fff' }}>Loading table...</div>

  const activeBets: RouletteBet[] = JSON.parse(gameState.activeBets || '[]')
  const chatHistory = JSON.parse(gameState.chatHistory || '[]')

  // Generate conic gradient for the wheel
  const wheelGradientStops = WHEEL_SEQUENCE.map((num, i) => {
    const color = getNumberColor(num)
    const bg = color === 'red' ? '#cc0000' : color === 'black' ? '#111111' : '#00aa00'
    return `${bg} ${i * sliceAngle}deg ${(i + 1) * sliceAngle}deg`
  }).join(', ')

  // Helper to render chips on a betting area
  const renderChips = (type: RouletteBetType) => {
    const bets = activeBets.filter(b => b.type === type)
    if (bets.length === 0) return null

    // Sum up total bet for this spot to simplify visual
    const totalAmount = bets.reduce((sum, b) => sum + b.amount, 0)
    
    return (
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 10 }}>
        <div style={{ 
          width: '30px', height: '30px', borderRadius: '50%', background: '#ffcc00', border: '3px dashed #fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '0.7rem', fontWeight: 'bold',
          boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
        }}>
          {totalAmount}
        </div>
      </div>
    )
  }

  const BetArea = ({ type, label, bg = '#006600', color = '#fff', flex = 1, border = '1px solid #fff', height = '100%', extraStyle = {} }: any) => (
    <div 
      onClick={() => handleBet(type)}
      style={{ 
        flex, height, background: bg, border, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, cursor: (spinning || gameState.status !== 'BETTING') ? 'not-allowed' : 'pointer', position: 'relative',
        transition: 'all 0.1s', ...extraStyle
      }}
      onMouseEnter={(e) => { if (!spinning && gameState.status === 'BETTING') e.currentTarget.style.filter = 'brightness(1.2)' }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)' }}
    >
      <span style={{ pointerEvents: 'none' }}>{label}</span>
      {renderChips(type)}
    </div>
  )

  // Generate numbers grid (columns 1 to 12)
  const numberCols = []
  for (let i = 0; i < 12; i++) {
    const colNums = [
      String(3 + i * 3), // Top row
      String(2 + i * 3), // Middle row
      String(1 + i * 3), // Bottom row
    ]
    numberCols.push(colNums)
  }

  return (
    <div style={{ 
      display: 'flex', width: '100%', height: 'calc(100vh - 120px)', padding: '10px 20px', gap: '20px',
      background: 'radial-gradient(circle at 50% 50%, #002244 0%, #000a14 100%)', overflow: 'hidden' 
    }}>
      
      {/* LEFT SIDE: GAME BOARD */}
      <div style={{ flex: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
        
        {/* TOP FLOATING ELEMENTS */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: 0 }}>
          <button onClick={onLeave} className="btn-secondary" style={{ padding: '6px 16px', borderRadius: '20px' }}>← Leave Table</button>
          
          <div style={{ background: 'rgba(0,0,0,0.6)', padding: '4px 20px', borderRadius: '20px', border: '1px solid #d4af37' }}>
            <h2 style={{ color: '#d4af37', margin: 0, fontSize: '1rem', textTransform: 'uppercase' }}>{gameState.name}</h2>
          </div>

          <div style={{ color: errorMsg ? '#ff3333' : '#fff', fontWeight: 'bold' }}>
            {errorMsg}
          </div>
        </div>

        {/* WHEEL AND HUD SECTION */}
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          
          {/* LEFT: TABLE INFO HUD */}
          <div style={{ 
            flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', 
            background: 'rgba(0,0,0,0.6)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
          }}>
            <h4 style={{ color: '#d4af37', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>Table Rules</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ccc' }}><span>Min Bet</span><span style={{color:'#fff', fontWeight: 'bold'}}>$1</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ccc' }}><span>Max Bet</span><span style={{color:'#fff', fontWeight: 'bold'}}>$10,000</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ccc', marginTop: '5px' }}><span>Straight Up</span><span style={{color:'#ffcc00', fontWeight: 'bold'}}>35:1</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ccc' }}><span>Outside Bets</span><span style={{color:'#ffcc00', fontWeight: 'bold'}}>2:1 / 1:1</span></div>
          </div>

          {/* CENTER: TRADITIONAL WHEEL DISPLAY */}
          <div style={{ position: 'relative', width: '200px', height: '200px', flexShrink: 0, margin: '0 40px' }}>
            
            {/* Wheel Background */}
            <motion.div 
              style={{ width: '100%', height: '100%', borderRadius: '50%', background: `conic-gradient(${wheelGradientStops})`, border: '8px solid #333', boxShadow: '0 0 20px rgba(0,0,0,0.8)' }}
              animate={{ rotate: wheelRotation }}
              transition={{ type: 'tween', ease: [0.1, 0.9, 0.2, 1], duration: spinning ? 2.5 : 0 }}
            >
              {/* Numbers on the wheel */}
              {WHEEL_SEQUENCE.map((num, i) => {
                const angle = (i * sliceAngle) + (sliceAngle / 2)
                return (
                  <div key={num} style={{
                    position: 'absolute', top: '2px', left: '50%',
                    transformOrigin: '50% 90px', // Center of the 200px wheel is 100px minus 8px border = 92px roughly
                    transform: `translateX(-50%) rotate(${angle}deg)`,
                    color: '#fff', fontSize: '0.65rem', fontWeight: 'bold'
                  }}>
                    {num}
                  </div>
                )
              })}
              
              {/* Inner decorative circle */}
              <div style={{ position: 'absolute', top: '40px', left: '40px', right: '40px', bottom: '40px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', background: 'radial-gradient(circle, #222 0%, #111 100%)', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)' }} />
            </motion.div>

            {/* Winning pointer at the top */}
            <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: '20px solid #ffcc00', zIndex: 10, filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }} />

            {/* Result Overlay */}
            <AnimatePresence>
              {spinResult && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', bottom: '20px', borderRadius: '50%', background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}
                >
                  <div style={{ 
                    width: '80px', height: '80px', borderRadius: '50%', border: '4px solid #ffcc00',
                    background: getNumberColor(spinResult) === 'red' ? '#ff3333' : getNumberColor(spinResult) === 'black' ? '#222' : '#00cc66',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '2.5rem', fontWeight: 'bold', boxShadow: '0 0 30px #ffcc00'
                  }}>
                    {spinResult}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: RECENT ROLLS HUD */}
          <div style={{ 
            flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', 
            background: 'rgba(0,0,0,0.6)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
          }}>
            <h4 style={{ color: '#00ffcc', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px', textAlign: 'right' }}>Previous Rolls</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {chatHistory.slice().reverse().filter((msg: any) => msg.text.startsWith('Winning number is')).length === 0 ? (
                <span style={{ color: '#aaa', fontSize: '0.8rem', fontStyle: 'italic' }}>No spins yet</span>
              ) : (
                chatHistory.slice().reverse()
                  .filter((msg: any) => msg.text.startsWith('Winning number is'))
                  .map((msg: any) => msg.text.match(/is (\d+|00) /)?.[1])
                  .filter(Boolean)
                  .slice(0, 10)
                  .map((num: any, i: number) => {
                    const color = getNumberColor(num)
                    const bg = color === 'red' ? '#cc0000' : color === 'black' ? '#111' : '#00cc66'
                    return (
                      <div key={i} style={{ 
                        width: '28px', height: '28px', borderRadius: '50%', background: bg, border: '2px solid #fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.5)', opacity: i === 0 ? 1 : 0.7
                      }}>
                        {num}
                      </div>
                    )
                  })
              )}
            </div>
          </div>
        </div>

        {/* ROULETTE MAT */}
        <div style={{ 
          width: '100%', flex: 1, minHeight: 0, display: 'flex', gap: '5px',
          border: '10px solid #5c3a21', borderRadius: '20px', background: '#006600', padding: '10px',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8)'
        }}>
          
          {/* LEFT: 0 and 00 */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '5px' }}>
            <BetArea type="STRAIGHT_UP_00" label="00" bg="#00aa00" extraStyle={{ fontSize: '1.5rem', fontWeight: 'bold', borderRadius: '10px 0 0 0' }} />
            <BetArea type="STRAIGHT_UP_0" label="0" bg="#00aa00" extraStyle={{ fontSize: '1.5rem', fontWeight: 'bold', borderRadius: '0 0 0 10px' }} />
          </div>

          {/* CENTER: Numbers and Outside Bets */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 12, gap: '5px' }}>
            
            {/* Numbers Grid */}
            <div style={{ display: 'flex', flex: 3, gap: '5px' }}>
              {numberCols.map((col, cIdx) => (
                <div key={cIdx} style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '5px' }}>
                  {col.map(num => {
                    const color = getNumberColor(num)
                    const bg = color === 'red' ? '#cc0000' : color === 'black' ? '#111' : '#00aa00'
                    return <BetArea key={num} type={`STRAIGHT_UP_${num}`} label={num} bg={bg} extraStyle={{ fontSize: '1.5rem', fontWeight: 'bold' }} />
                  })}
                </div>
              ))}
            </div>

            {/* DOZENS */}
            <div style={{ display: 'flex', flex: 1, gap: '5px' }}>
              <BetArea type="1ST_12" label="1st 12" extraStyle={{ fontSize: '1.2rem', fontWeight: 'bold' }} />
              <BetArea type="2ND_12" label="2nd 12" extraStyle={{ fontSize: '1.2rem', fontWeight: 'bold' }} />
              <BetArea type="3RD_12" label="3rd 12" extraStyle={{ fontSize: '1.2rem', fontWeight: 'bold' }} />
            </div>

            {/* OUTSIDE BOTTOM */}
            <div style={{ display: 'flex', flex: 1, gap: '5px' }}>
              <BetArea type="1_TO_18" label="1 to 18" extraStyle={{ fontSize: '1rem', fontWeight: 'bold' }} />
              <BetArea type="EVEN" label="EVEN" extraStyle={{ fontSize: '1rem', fontWeight: 'bold' }} />
              <BetArea type="RED" label={<div style={{ width:'30px',height:'30px',background:'#cc0000',transform:'rotate(45deg)'}}></div>} extraStyle={{ fontSize: '1rem', fontWeight: 'bold' }} />
              <BetArea type="BLACK" label={<div style={{ width:'30px',height:'30px',background:'#111',transform:'rotate(45deg)'}}></div>} extraStyle={{ fontSize: '1rem', fontWeight: 'bold' }} />
              <BetArea type="ODD" label="ODD" extraStyle={{ fontSize: '1rem', fontWeight: 'bold' }} />
              <BetArea type="19_TO_36" label="19 to 36" extraStyle={{ fontSize: '1rem', fontWeight: 'bold' }} />
            </div>
          </div>

          {/* RIGHT: 2:1 Columns */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '5px' }}>
            <BetArea type="COL_3" label="2:1" extraStyle={{ fontSize: '1rem', fontWeight: 'bold', borderRadius: '0 10px 0 0' }} />
            <BetArea type="COL_2" label="2:1" extraStyle={{ fontSize: '1rem', fontWeight: 'bold' }} />
            <BetArea type="COL_1" label="2:1" extraStyle={{ fontSize: '1rem', fontWeight: 'bold', borderRadius: '0 0 10px 0' }} />
          </div>

        </div>

        {/* CONTROLS */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', flexShrink: 0 }}>
          
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.6)', padding: '8px 16px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.2)' }}>
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

          <button 
            onClick={handleSpin} 
            disabled={isProcessing || spinning || gameState.status !== 'BETTING'}
            style={{ 
              background: 'linear-gradient(135deg, #00ffcc 0%, #00cc99 100%)', color: '#000', 
              border: 'none', borderRadius: '30px', padding: '12px 40px', fontSize: '1.5rem', fontWeight: 'bold', 
              cursor: (isProcessing || spinning) ? 'not-allowed' : 'pointer', opacity: (isProcessing || spinning) ? 0.5 : 1,
              boxShadow: '0 10px 20px rgba(0,0,0,0.5)', textTransform: 'uppercase'
            }}
          >
            {spinning ? 'Spinning...' : 'SPIN WHEEL'}
          </button>
        </div>
      </div>

      {/* RIGHT SIDE: HISTORY LOG */}
      <div style={{ 
        flex: 1, minWidth: '250px', maxWidth: '300px', background: 'rgba(0,0,0,0.7)', 
        borderRadius: '20px', border: '2px solid rgba(0,255,204,0.3)', padding: '15px', 
        display: 'flex', flexDirection: 'column', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
      }}>
        <h3 style={{ color: '#00ffcc', marginTop: 0, textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1rem' }}>
          Action Log
        </h3>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
          {chatHistory.slice().reverse().map((msg: any, i: number) => (
            <div key={i} style={{ fontSize: '0.85rem', color: '#fff', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px', borderLeft: `3px solid #00ffcc` }}>
              <strong style={{ color: '#00ffcc', display: 'block', marginBottom: '2px', fontSize: '0.75rem', textTransform: 'uppercase' }}>{msg.sender}</strong>
              {msg.text}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
