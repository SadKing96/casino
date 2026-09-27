'use client'

import { useUser } from '@/context/UserContext'
import { getTableState, placeBet, drawNumbers, clearTable } from './actions'
import { KenoBet } from './utils'
import { useState, useEffect } from 'react'

export default function KenoTableUI({ tableId, onLeave }: { tableId: string, onLeave: () => void }) {
  const { user, updateBalances } = useUser()
  const [table, setTable] = useState<any>(null)
  const [selectedChip, setSelectedChip] = useState<number>(10)
  const [betAmount, setBetAmount] = useState(0)
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadTable()
    const interval = setInterval(loadTable, 2000)
    return () => clearInterval(interval)
  }, [])

  const loadTable = async () => {
    const state = await getTableState(tableId)
    setTable(state)
    if (user && state?.status === 'DRAWN') {
      const { getUser } = await import('@/app/actions')
      const freshUser = await getUser()
      if (freshUser) {
        updateBalances(freshUser.chipBalance, freshUser.bankBalance)
      }
    }
  }

  const toggleNumber = (num: number) => {
    if (table?.status !== 'BETTING' || myBet) return
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== num))
    } else {
      if (selectedNumbers.length < 10) {
        setSelectedNumbers([...selectedNumbers, num])
      }
    }
  }

  const handlePlaceBet = async () => {
    const finalBet = betAmount || 10;
    if (!user || isProcessing || table?.status !== 'BETTING' || selectedNumbers.length === 0) return
    setIsProcessing(true)
    try {
      await placeBet(tableId, finalBet, selectedNumbers)
      updateBalances(user.chipBalance - finalBet, user.bankBalance)
      await loadTable()
    } catch (e: any) {
      alert(e.message)
    }
    setIsProcessing(false)
  }

  const handleDraw = async () => {
    if (isProcessing) return
    setIsProcessing(true)
    try {
      await drawNumbers(tableId)
      await loadTable()
    } catch (e: any) {
      alert(e.message)
    }
    setIsProcessing(false)
  }

  const handleNextRound = async () => {
    if (isProcessing) return
    setIsProcessing(true)
    try {
      await clearTable(tableId)
      setBetAmount(0)
      setSelectedNumbers([])
      await loadTable()
    } catch (e: any) {
      alert(e.message)
    }
    setIsProcessing(false)
  }

  if (!table || !user) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Table...</div>

  const activeBets: Record<string, KenoBet> = JSON.parse(table.activeBets)
  const myBet = activeBets[user.id]
  const drawnNumbers: number[] = JSON.parse(table.drawnNumbers || "[]")
  const amIHost = true

  const renderNumberBox = (num: number) => {
    const isSelectedByMe = myBet ? myBet.selectedNumbers.includes(num) : selectedNumbers.includes(num)
    const isDrawn = drawnNumbers.includes(num)
    
    let bg = 'linear-gradient(to bottom, #0033aa, #001155)'
    let border = '1px solid #0055ff'
    let color = '#fff'
    
    if (table.status === 'DRAWN') {
      if (isSelectedByMe && isDrawn) {
        bg = 'linear-gradient(to bottom, #ffcc00, #cc9900)'
        color = '#000'
        border = '2px solid #fff'
      } else if (isSelectedByMe && !isDrawn) {
        bg = 'linear-gradient(to bottom, #ffcc00, #cc9900)'
        color = '#000'
        border = '1px solid #fff'
      } else if (!isSelectedByMe && isDrawn) {
        bg = 'linear-gradient(to bottom, #ff3333, #cc0000)'
        color = '#fff'
        border = '1px solid #fff'
      }
    } else {
      if (isSelectedByMe) {
        bg = 'linear-gradient(to bottom, #ffcc00, #cc9900)'
        color = '#000'
        border = '1px solid #fff'
      }
    }

    return (
      <div 
        key={num}
        onClick={() => toggleNumber(num)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '6px', cursor: table.status === 'BETTING' && !myBet ? 'pointer' : 'default',
          background: bg, border: border, color: color,
          fontWeight: 'bold', fontSize: '1.6rem',
          boxShadow: isSelectedByMe ? 'inset 0 0 10px rgba(255,255,255,0.8)' : 'inset 0 0 5px rgba(0,0,0,0.5)',
          position: 'relative'
        }}
      >
        {isSelectedByMe && (
           <div style={{ position: 'absolute', top: '2px', right: '4px', fontSize: '0.8rem', color: '#000' }}>✓</div>
        )}
        {num}
      </div>
    )
  }

  return (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, 
      background: 'linear-gradient(to bottom, #000a1f, #000)', 
      display: 'flex', flexDirection: 'column',
      fontFamily: 'sans-serif'
    }}>
      
      {/* Leave Game Button floating */}
      <button 
        onClick={onLeave} 
        style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1010, background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid #555', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}
      >
        Exit Game
      </button>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, padding: '40px' }}>
        
        {/* Left Side: Paytable & Logo */}
        <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '6rem', margin: 0, color: '#FFD700', textShadow: '3px 3px 0 #b38000, -3px -3px 0 #b38000, 3px -3px 0 #b38000, -3px 3px 0 #b38000, 0 0 20px #ff00ff', lineHeight: 1 }}>KENO</h1>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.8rem', textShadow: '0 0 10px #ff00ff' }}>WIN UP TO $100,000!</h3>
          </div>
          
          <div style={{ border: '3px solid #0055ff', borderRadius: '12px', padding: '15px', background: 'rgba(0, 10, 30, 0.8)', boxShadow: 'inset 0 0 20px rgba(0, 85, 255, 0.5)' }}>
            <table style={{ width: '100%', color: '#fff', fontSize: '1.4rem', textAlign: 'right', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#FFD700', borderBottom: '2px solid #333' }}>
                  <th style={{ textAlign: 'left', paddingBottom: '10px' }}>HITS</th>
                  <th style={{ paddingBottom: '10px' }}>WIN</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [10, '$100,000'],
                  [9, '$10,000'],
                  [8, '$2,000'],
                  [7, '$500'],
                  [6, '$50'],
                  [5, '$10'],
                  [4, '$3'],
                  [3, '$1']
                ].map(([hits, win], i) => (
                  <tr key={i}>
                    <td style={{ textAlign: 'left', color: '#00ffcc', padding: '5px 0' }}>{hits}</td>
                    <td style={{ padding: '5px 0' }}>{win}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ border: '3px solid #0055ff', borderRadius: '12px', padding: '20px', background: 'rgba(0, 10, 30, 0.8)', textAlign: 'center', color: '#FFD700', fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-around', boxShadow: 'inset 0 0 20px rgba(0, 85, 255, 0.5)' }}>
            <div>MARKED <br/><span style={{ color: '#ff3333', fontSize: '2.5rem' }}>{myBet ? myBet.selectedNumbers.length : selectedNumbers.length}</span></div>
            <div>HIT <br/><span style={{ color: '#ff3333', fontSize: '2.5rem' }}>{myBet?.hits || 0}</span></div>
          </div>

        </div>

        {/* Right Side: 80 Numbers Grid */}
        <div style={{ flex: 1, paddingLeft: '40px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ 
            flex: 1, 
            display: 'grid', 
            gridTemplateColumns: 'repeat(10, 1fr)', 
            gridTemplateRows: 'repeat(8, 1fr)',
            gap: '6px',
            background: 'linear-gradient(to bottom, #001133, #000)',
            border: '4px solid #0055ff',
            padding: '15px',
            borderRadius: '16px',
            boxShadow: '0 0 30px rgba(0, 85, 255, 0.3)'
          }}>
            {Array.from({ length: 80 }, (_, i) => i + 1).map(num => renderNumberBox(num))}
          </div>
          <div style={{ textAlign: 'center', color: '#fff', marginTop: '20px', fontSize: '1.5rem', letterSpacing: '3px' }}>
            {table.status === 'BETTING' ? (myBet ? 'WAITING FOR DRAW...' : 'MARK OR TOUCH SPOTS. PLAY 10 CREDITS') : 'DRAW COMPLETE'}
          </div>
        </div>
      </div>

      {/* Bottom Area: Controls & Meters */}
      <div style={{ display: 'flex', padding: '30px 40px', background: 'linear-gradient(to bottom, #111, #000)', borderTop: '4px solid #0055ff', alignItems: 'center', justifyContent: 'space-between' }}>
        
        <div style={{ display: 'flex', gap: '30px' }}>
          <div style={{ border: '2px solid #0055ff', borderRadius: '8px', padding: '15px 30px', textAlign: 'center', background: '#000', boxShadow: 'inset 0 0 15px rgba(0, 85, 255, 0.3)' }}>
            <div style={{ color: '#0055ff', fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '2px' }}>BET</div>
            <div style={{ color: '#FFD700', fontSize: '2.5rem', fontWeight: 'bold' }}>{myBet ? myBet.amount : (betAmount || 10)}</div>
          </div>
          <div style={{ border: '2px solid #0055ff', borderRadius: '8px', padding: '15px 30px', textAlign: 'center', background: '#000', width: '180px', boxShadow: 'inset 0 0 15px rgba(0, 85, 255, 0.3)' }}>
            <div style={{ color: '#0055ff', fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '2px' }}>WIN</div>
            <div style={{ color: '#FFD700', fontSize: '2.5rem', fontWeight: 'bold' }}>{myBet ? myBet.profit : 0}</div>
          </div>
        </div>

        <div style={{ color: '#ff3333', fontSize: '4rem', fontWeight: 'bold', textShadow: '3px 3px 0px #000, 0 0 20px #ff3333' }}>
          25¢
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {table.status === 'BETTING' && !myBet && (
            <>
              <button 
                onClick={() => {
                  const nums: number[] = []
                  while(nums.length < 10) {
                    const r = Math.floor(Math.random() * 80) + 1
                    if(!nums.includes(r)) nums.push(r)
                  }
                  setSelectedNumbers(nums)
                  setBetAmount(10)
                }}
                style={{ background: 'linear-gradient(to bottom, #fff, #ccc)', color: '#000', fontWeight: '900', border: '3px solid #777', padding: '20px 30px', borderRadius: '8px', fontSize: '1.5rem', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.5)' }}
              >
                QUICK<br/>PICK
              </button>
              <button 
                onClick={() => { setSelectedNumbers([]); setBetAmount(0); }}
                style={{ background: 'linear-gradient(to bottom, #fff, #ccc)', color: '#000', fontWeight: '900', border: '3px solid #777', padding: '20px 30px', borderRadius: '8px', fontSize: '1.5rem', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.5)' }}
              >
                ERASE
              </button>
              <button 
                onClick={() => {
                   if(betAmount === 0) setBetAmount(10);
                   handlePlaceBet();
                }} 
                disabled={isProcessing || selectedNumbers.length === 0}
                style={{ background: 'linear-gradient(to bottom, #ff9900, #cc3300)', color: '#fff', fontWeight: '900', border: '3px solid #ffcc00', padding: '30px 60px', borderRadius: '12px', fontSize: '2.5rem', cursor: 'pointer', boxShadow: '0 0 20px #ff9900', opacity: selectedNumbers.length === 0 ? 0.5 : 1, textShadow: '2px 2px 0 #000' }}
              >
                START
              </button>
            </>
          )}

          {table.status === 'BETTING' && amIHost && (
             <button 
              onClick={handleDraw} disabled={isProcessing}
              style={{ background: 'linear-gradient(to bottom, #ff9900, #cc3300)', color: '#fff', fontWeight: '900', border: '3px solid #ffcc00', padding: '30px 60px', borderRadius: '12px', fontSize: '2.5rem', cursor: 'pointer', boxShadow: '0 0 20px #ff9900', textShadow: '2px 2px 0 #000' }}
            >
              DRAW
            </button>
          )}

          {table.status === 'DRAWN' && amIHost && (
            <button 
              onClick={handleNextRound} disabled={isProcessing}
              style={{ background: 'linear-gradient(to bottom, #ff9900, #cc3300)', color: '#fff', fontWeight: '900', border: '3px solid #ffcc00', padding: '30px 60px', borderRadius: '12px', fontSize: '2.5rem', cursor: 'pointer', boxShadow: '0 0 20px #ff9900', textShadow: '2px 2px 0 #000' }}
            >
              NEXT
            </button>
          )}

          <div style={{ border: '2px solid #0055ff', borderRadius: '8px', padding: '15px 30px', textAlign: 'center', background: '#000', marginLeft: '20px', boxShadow: 'inset 0 0 15px rgba(0, 85, 255, 0.3)' }}>
            <div style={{ color: '#0055ff', fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '2px' }}>CREDIT</div>
            <div style={{ color: '#FFD700', fontSize: '2.5rem', fontWeight: 'bold' }}>${user.chipBalance.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
