'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@/context/UserContext'
import { submitBarShift } from './actions'

type Drink = 'Beer' | 'Martini' | 'Whiskey'

interface Customer {
  id: string
  order: Drink
  patience: number
  maxPatience: number
}

const DRINK_ICONS: Record<Drink, string> = {
  Beer: '🍺',
  Martini: '🍸',
  Whiskey: '🥃',
}

const MAX_STOCK = 5

export default function Table() {
  const { user, updateCredits } = useUser()
  const [isPlaying, setIsPlaying] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stock, setStock] = useState<Record<Drink, number>>({ Beer: MAX_STOCK, Martini: MAX_STOCK, Whiskey: MAX_STOCK })
  const [counter, setCounter] = useState<Drink | null>(null)
  const [score, setScore] = useState(0)
  const [isPouring, setIsPouring] = useState<Drink | null>(null)
  const [isRestocking, setIsRestocking] = useState<Drink | null>(null)
  const [customersServed, setCustomersServed] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const customerIdRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startGame = () => {
    setIsPlaying(true)
    setScore(0)
    setCustomersServed(0)
    setCustomers([])
    setStock({ Beer: MAX_STOCK, Martini: MAX_STOCK, Whiskey: MAX_STOCK })
    setCounter(null)
  }

  const endShift = async () => {
    setIsPlaying(false)
    if (score > 0) {
      setIsSubmitting(true)
      try {
        const { profit } = await submitBarShift(score, customersServed)
        if (profit > 0 && user) {
          updateCredits(user.credits + profit)
        }
      } catch (e) {
        console.error(e)
      }
      setIsSubmitting(false)
    }
  }

  // Game Loop
  useEffect(() => {
    if (!isPlaying) return

    intervalRef.current = setInterval(() => {
      // Spawn new customer randomly
      if (Math.random() < 0.3 && customers.length < 4) {
        setCustomers((prev) => {
          if (prev.length >= 4) return prev
          const drinks: Drink[] = ['Beer', 'Martini', 'Whiskey']
          const order = drinks[Math.floor(Math.random() * drinks.length)]
          const maxPatience = 100
          return [...prev, {
            id: `cust-${Date.now()}-${customerIdRef.current++}`,
            order,
            patience: maxPatience,
            maxPatience
          }]
        })
      }

      // Decrease patience
      setCustomers((prev) => {
        return prev.map(c => ({ ...c, patience: c.patience - 5 })).filter(c => c.patience > 0)
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, customers.length])

  const pourDrink = (drink: Drink) => {
    if (isPouring || isRestocking || counter) return
    if (stock[drink] <= 0) return

    setIsPouring(drink)
    setTimeout(() => {
      setStock(prev => ({ ...prev, [drink]: prev[drink] - 1 }))
      setCounter(drink)
      setIsPouring(null)
    }, 1000)
  }

  const restockDrink = (drink: Drink) => {
    if (isPouring || isRestocking || stock[drink] === MAX_STOCK) return
    
    setIsRestocking(drink)
    setTimeout(() => {
      setStock(prev => ({ ...prev, [drink]: MAX_STOCK }))
      setIsRestocking(null)
    }, 2000)
  }

  const serveCustomer = (customerId: string, order: Drink) => {
    if (counter === order) {
      setCustomers(prev => prev.filter(c => c.id !== customerId))
      setCounter(null)
      setScore(s => s + 10)
      setCustomersServed(cs => cs + 1)
    } else if (counter) {
      // Threw away drink
      setCounter(null)
    }
  }

  const trashDrink = () => {
    setCounter(null)
  }

  return (
    <div className="glass-panel" style={{ 
      width: '100%', maxWidth: '800px', margin: '0 auto', padding: '24px', 
      display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative',
      minHeight: '500px', backgroundColor: 'rgba(20, 10, 30, 0.8)'
    }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-gradient-gold" style={{ margin: 0 }}>Tips: ${score}</h2>
          <p style={{ margin: 0, opacity: 0.7 }}>Served: {customersServed}</p>
        </div>
        {isPlaying ? (
          <button className="btn-secondary" onClick={endShift} disabled={isSubmitting}>
            {isSubmitting ? 'Cashing out...' : 'End Shift & Collect Tips'}
          </button>
        ) : (
          <button className="btn-primary" onClick={startGame}>Start Shift</button>
        )}
      </div>

      {!isPlaying && score === 0 && !isSubmitting && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
          Press "Start Shift" to begin serving!
        </div>
      )}

      {/* Game Area */}
      {isPlaying && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Customers Area */}
          <div style={{ display: 'flex', gap: '16px', minHeight: '150px', alignItems: 'flex-end', justifyContent: 'center' }}>
            {customers.map((c, i) => (
              <div key={c.id} 
                onClick={() => serveCustomer(c.id, c.order)}
                style={{ 
                  width: '120px', height: '140px', background: 'rgba(255,255,255,0.1)', 
                  borderRadius: '12px 12px 0 0', padding: '10px', display: 'flex', 
                  flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                  cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid rgba(255,255,255,0.2)',
                  animation: 'slideUp 0.3s ease-out'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👤</div>
                <div style={{ background: '#fff', color: '#000', padding: '4px 8px', borderRadius: '16px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {DRINK_ICONS[c.order]}
                </div>
                {/* Patience Bar */}
                <div style={{ width: '100%', height: '6px', background: '#333', borderRadius: '3px', marginTop: 'auto' }}>
                  <div style={{ 
                    height: '100%', borderRadius: '3px', width: `${(c.patience / c.maxPatience) * 100}%`,
                    background: c.patience > 50 ? '#00e676' : c.patience > 25 ? '#ffea00' : '#ff1744',
                    transition: 'width 1s linear'
                  }} />
                </div>
              </div>
            ))}
            {customers.length === 0 && <div style={{ opacity: 0.5, fontStyle: 'italic', paddingBottom: '20px' }}>Waiting for customers...</div>}
          </div>

          {/* Bar Counter (The physical bar) */}
          <div style={{ 
            height: '120px', background: 'linear-gradient(180deg, #5c3a21 0%, #3e2723 100%)', 
            borderRadius: '8px', borderTop: '4px solid #8d6e63', display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', boxShadow: '0 10px 20px rgba(0,0,0,0.5)'
          }}>
            <div style={{ position: 'absolute', top: '-10px', width: '100%', textAlign: 'center', color: '#fff', fontSize: '0.8rem', opacity: 0.5 }}>THE BAR</div>
            
            {/* Prepared Drink on Counter */}
            <div 
              onClick={trashDrink}
              style={{
                width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem',
                border: counter ? '2px solid var(--neon-gold)' : '2px dashed rgba(255,255,255,0.2)',
                cursor: counter ? 'pointer' : 'default', transition: 'all 0.2s'
              }}
              title={counter ? "Trash Drink" : "Empty Counter"}
            >
              {counter ? DRINK_ICONS[counter] : ''}
            </div>
          </div>

          {/* Bottles & Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-evenly', padding: '16px', background: 'rgba(0,0,0,0.4)', borderRadius: '16px' }}>
            {(['Beer', 'Martini', 'Whiskey'] as Drink[]).map(drink => (
              <div key={drink} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <button 
                    onClick={() => pourDrink(drink)}
                    disabled={stock[drink] === 0 || !!isPouring || !!isRestocking || !!counter}
                    className="glass-panel"
                    style={{
                      width: '80px', height: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      fontSize: '2.5rem', cursor: stock[drink] > 0 && !isPouring && !isRestocking && !counter ? 'pointer' : 'not-allowed',
                      border: isPouring === drink ? '2px solid var(--neon-blue)' : stock[drink] === 0 ? '2px solid #ff1744' : '1px solid rgba(255,255,255,0.2)',
                      background: stock[drink] === 0 ? 'rgba(255,23,68,0.2)' : 'rgba(255,255,255,0.05)',
                      opacity: stock[drink] === 0 ? 0.5 : 1
                    }}
                  >
                    {DRINK_ICONS[drink]}
                    <span style={{ fontSize: '0.8rem', marginTop: '8px' }}>{stock[drink]}/{MAX_STOCK}</span>
                  </button>
                  
                  {isPouring === drink && (
                    <div style={{ position: 'absolute', bottom: '-10px', left: 0, width: '100%', height: '4px', background: '#333', borderRadius: '2px' }}>
                      <div style={{ height: '100%', background: 'var(--neon-blue)', width: '100%', animation: 'fillBar 1s linear' }} />
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => restockDrink(drink)}
                  disabled={stock[drink] === MAX_STOCK || !!isPouring || !!isRestocking}
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '4px 12px', opacity: stock[drink] === MAX_STOCK ? 0.3 : 1 }}
                >
                  {isRestocking === drink ? 'Restocking...' : 'Restock'}
                </button>
              </div>
            ))}
          </div>

        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fillBar {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}} />
    </div>
  )
}
