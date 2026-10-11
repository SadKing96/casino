'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import { withdrawCredits, depositCredits, buyCoins } from '@/app/actions'
import FriendsList from './FriendsList'

export default function LobbyClient({ initialLeaderboard, enabledGames = [] }: { initialLeaderboard: any[], enabledGames?: string[] }) {
  const { user, updateCredits } = useUser()
  const [view, setView] = useState<'lobby' | 'category'>('lobby')
  const [category, setCategory] = useState('Slots')
  const [isProcessing, setIsProcessing] = useState(false)
  const [chipAmount, setChipAmount] = useState(100)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const cat = urlParams.get('category')
      if (cat) {
        setCategory(cat)
        setView('category')
      }
    }
  }, [])
  
  const handleWithdraw = async () => {
    if (!user) return
    setIsProcessing(true)
    try {
      const updatedUser = await withdrawCredits(chipAmount)
      updateCredits(updatedUser!.credits)
    } catch (e) {
      console.error(e)
    }
    setIsProcessing(false)
  }

  const handleDeposit = async () => {
    if (!user) return
    setIsProcessing(true)
    try {
      const updatedUser = await depositCredits(chipAmount)
      updateCredits(updatedUser!.credits)
    } catch (e) {
      console.error(e)
    }
    setIsProcessing(false)
  }

  const handleBuyCoins = async () => {
    if (!user) return
    setIsProcessing(true)
    try {
      const updatedUser = await buyCoins(1000)
      updateCredits(updatedUser!.credits)
    } catch (e) {
      console.error(e)
    }
    setIsProcessing(false)
  }

  return (
    <div className="lobby-grid">
      
      {/* LEFT COLUMN: Leaderboard & Categories */}
      <div className="lobby-col">
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '50%' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '1.2rem' }} className="text-gradient-gold">Leaderboard (Top Wins)</h2>
          <div className="lobby-col-content">
            {initialLeaderboard.map((spin, i) => (
              <div key={spin.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--surface-border)' }}>
                <span style={{ fontWeight: i === 0 ? 'bold' : 'normal', color: i === 0 ? 'var(--neon-gold)' : '#fff' }}>
                  {i + 1}. {spin.user.username}
                </span>
                <span style={{ color: 'var(--neon-gold)' }}>+${spin.win.toLocaleString()}</span>
              </div>
            ))}
            {initialLeaderboard.length === 0 && <p style={{ opacity: 0.5 }}>No wins yet.</p>}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '50%' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>Top Played Games</h2>
          <div className="lobby-col-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { name: 'Frankenstein Slots', href: '/games/frankenstein', icon: '🧟‍♂️' },
              { name: 'Blackjack', href: '/games/blackjack', icon: '🃏' },
              { name: 'The Casino Bar', href: '/games/bar', icon: '🍸' },
            ].map(game => (
              <Link key={game.name} href={user ? game.href : "/login"} style={{ textDecoration: 'none' }}>
                <button
                  className="btn-secondary"
                  style={{ 
                    textAlign: 'left', 
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    borderColor: 'var(--surface-border)',
                    color: '#fff',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--neon-gold)'; e.currentTarget.style.color = 'var(--neon-gold)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--surface-border)'; e.currentTarget.style.color = '#fff'; }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{game.icon}</span>
                  {game.name}
                </button>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* MIDDLE COLUMN: Welcome & Games */}
      <div className="lobby-col">
        {view === 'lobby' ? (
          <div className="lobby-col-content" style={{ display: 'flex', flexDirection: 'column', gap: '30px', padding: '20px 0' }}>
            

            {/* The Lounge / Bar Special Banner */}
            <div style={{ marginBottom: '10px' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#ff00ff', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>🍸 The Lounge</h3>
              <Link href={user ? "/games/bar" : "/login"} style={{ textDecoration: 'none' }}>
                <div className="glass-panel" style={{ 
                  display: 'flex', alignItems: 'center', padding: '16px 24px', borderRadius: '16px',
                  background: 'linear-gradient(90deg, rgba(255, 0, 128, 0.4) 0%, rgba(128, 0, 255, 0.2) 100%)',
                  border: '1px solid rgba(255, 0, 255, 0.3)', transition: 'all 0.2s', cursor: 'pointer'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 0, 255, 0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ fontSize: '2.5rem', marginRight: '20px' }}>🍻</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.2rem', margin: '0 0 4px 0', color: '#fff' }}>The Casino Bar</h3>
                    <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: 0, color: '#fff' }}>Serve drinks, keep customers happy, and earn tips!</p>
                  </div>
                  <div className="btn-primary" style={{ padding: '8px 24px', borderRadius: '20px', fontSize: '0.9rem', background: 'linear-gradient(135deg, #ff00ff, #8a2be2)', border: 'none' }}>{user ? 'Enter' : 'Log in'}</div>
                </div>
              </Link>
            </div>


            {/* Sleek Categories */}
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>Browse Categories</h3>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {[
                  { name: 'Slots', icon: '🎰', color: '#ff3366', bg: 'linear-gradient(135deg, rgba(255, 51, 102, 0.3) 0%, rgba(153, 0, 51, 0.6) 100%)' },
                  { name: 'Table Games', icon: '🃏', color: '#00e5ff', bg: 'linear-gradient(135deg, rgba(0, 229, 255, 0.3) 0%, rgba(0, 102, 153, 0.6) 100%)' },
                  { name: 'Arcade', icon: '🚀', color: '#ffcc00', bg: 'linear-gradient(135deg, rgba(255, 204, 0, 0.3) 0%, rgba(153, 102, 0, 0.6) 100%)' }
                ].map(cat => (
                  <div 
                    key={cat.name} 
                    className="glass-panel" 
                    style={{ 
                      width: '200px', height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px',
                      cursor: 'pointer', background: cat.bg, border: `2px solid ${cat.color}`, borderRadius: '16px',
                      transition: 'all 0.2s', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
                    }} 
                    onClick={() => { setCategory(cat.name); setView('category'); }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = `0 0 20px ${cat.color}66, inset 0 0 20px rgba(0,0,0,0.5)`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(0,0,0,0.5)'; }}
                  >
                    <div style={{ fontSize: '4.5rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}>{cat.icon}</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.4rem', color: '#fff', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>{cat.name}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="lobby-col-content" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--surface-border)' }}>
              <h1 style={{ fontSize: '2rem' }} className="text-gradient-gold">{category} Games</h1>
              <button className="btn-secondary" onClick={() => setView('lobby')}>← Back to Lobby</button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignContent: 'flex-start', justifyContent: 'center' }}>
              {category === 'Slots' && enabledGames.includes('slots') && (
                <Link href={user ? "/games/frankenstein" : "/login"} style={{ textDecoration: 'none' }}>
                  <div className="glass-panel game-card" style={{ 
                    width: '240px', height: '300px', display: 'flex', flexDirection: 'column',
                    transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
                    cursor: 'pointer', overflow: 'hidden'
                  }}>
                    <div style={{ height: '160px', background: 'linear-gradient(135deg, #2a0845 0%, #6441A5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '3rem' }}>🧟‍♂️⚡</span>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <h3 style={{ fontSize: '1.1rem' }}>Frankenstein</h3>
                      <p style={{ opacity: 0.7, fontSize: '0.8rem' }}>5-Reel slot machine</p>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold', fontSize: '0.9rem' }}>{user ? 'Play Now' : 'Log in to Play'}</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {category === 'Slots' && enabledGames.includes('slots') && (
                <Link href={user ? "/games/piggies" : "/login"} style={{ textDecoration: 'none' }}>
                  <div className="glass-panel game-card" style={{ 
                    width: '240px', height: '300px', display: 'flex', flexDirection: 'column',
                    transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
                    cursor: 'pointer', overflow: 'hidden'
                  }}>
                    <div style={{ height: '160px', background: 'linear-gradient(135deg, #ff0055 0%, #ff99bb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '3rem' }}>🐷🪙</span>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <h3 style={{ fontSize: '1.1rem' }}>Rich Little Piggies</h3>
                      <p style={{ opacity: 0.7, fontSize: '0.8rem' }}>Piggy Bank Features & Jackpots!</p>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold', fontSize: '0.9rem' }}>{user ? 'Play Now' : 'Log in to Play'}</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {category === 'Slots' && enabledGames.includes('slots') && (
                <Link href={user ? "/games/buffalo" : "/login"} style={{ textDecoration: 'none' }}>
                  <div className="glass-panel game-card" style={{ 
                    width: '240px', height: '300px', display: 'flex', flexDirection: 'column',
                    transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
                    cursor: 'pointer', overflow: 'hidden'
                  }}>
                    <div style={{ height: '160px', background: 'linear-gradient(135deg, #cc4400 0%, #661100 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '3rem' }}>🦬🌄</span>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <h3 style={{ fontSize: '1.1rem' }}>Buffalo King</h3>
                      <p style={{ opacity: 0.7, fontSize: '0.8rem' }}>1024 Ways to Win!</p>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold', fontSize: '0.9rem' }}>{user ? 'Play Now' : 'Log in to Play'}</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {category === 'Table Games' && enabledGames.includes('blackjack') && (
                <Link href={user ? "/games/blackjack" : "/login"} style={{ textDecoration: 'none' }}>
                  <div className="glass-panel game-card" style={{ 
                    width: '240px', height: '300px', display: 'flex', flexDirection: 'column',
                    transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
                    cursor: 'pointer', overflow: 'hidden'
                  }}>
                    <div style={{ height: '160px', background: 'linear-gradient(135deg, #004d00 0%, #001a00 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '3rem' }}>🃏♠️</span>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <h3 style={{ fontSize: '1.1rem' }}>Blackjack</h3>
                      <p style={{ opacity: 0.7, fontSize: '0.8rem' }}>Live AI Dealer (Marty)</p>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold', fontSize: '0.9rem' }}>{user ? 'Play Now' : 'Log in to Play'}</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {category === 'Table Games' && enabledGames.includes('holdem') && (
                <Link href={user ? "/games/holdem" : "/login"} style={{ textDecoration: 'none' }}>
                  <div className="glass-panel game-card" style={{ 
                    width: '240px', height: '300px', display: 'flex', flexDirection: 'column',
                    transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
                    cursor: 'pointer', overflow: 'hidden'
                  }}>
                    <div style={{ height: '160px', background: 'linear-gradient(135deg, #001144 0%, #000022 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '3rem' }}>🤠♦️</span>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <h3 style={{ fontSize: '1.1rem' }}>Texas Hold'em</h3>
                      <p style={{ opacity: 0.7, fontSize: '0.8rem' }}>Live AI Dealer (Rusty)</p>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold', fontSize: '0.9rem' }}>{user ? 'Play Now' : 'Log in to Play'}</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {category === 'Table Games' && enabledGames.includes('craps') && (
                <Link href={user ? "/games/craps" : "/login"} style={{ textDecoration: 'none' }}>
                  <div className="glass-panel game-card" style={{ 
                    width: '240px', height: '300px', display: 'flex', flexDirection: 'column',
                    transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
                    cursor: 'pointer', overflow: 'hidden'
                  }}>
                    <div style={{ height: '160px', background: 'linear-gradient(135deg, #008800 0%, #004400 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '3rem' }}>🎲🎲</span>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <h3 style={{ fontSize: '1.1rem' }}>Craps</h3>
                      <p style={{ opacity: 0.7, fontSize: '0.8rem' }}>Multiplayer Dice & Real Odds</p>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold', fontSize: '0.9rem' }}>{user ? 'Play Now' : 'Log in to Play'}</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {category === 'Table Games' && enabledGames.includes('roulette') && (
                <Link href={user ? "/games/roulette" : "/login"} style={{ textDecoration: 'none' }}>
                  <div className="glass-panel game-card" style={{ 
                    width: '240px', height: '300px', display: 'flex', flexDirection: 'column',
                    transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
                    cursor: 'pointer', overflow: 'hidden'
                  }}>
                    <div style={{ height: '160px', background: 'linear-gradient(135deg, #002244 0%, #000000 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '3rem' }}>🎡</span>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <h3 style={{ fontSize: '1.1rem' }}>Roulette</h3>
                      <p style={{ opacity: 0.7, fontSize: '0.8rem' }}>American Wheel & Outside Bets</p>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold', fontSize: '0.9rem' }}>{user ? 'Play Now' : 'Log in to Play'}</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}
              {category === 'Table Games' && enabledGames.includes('baccarat') && (
                <Link href={user ? "/games/baccarat" : "/login"} style={{ textDecoration: 'none' }}>
                  <div className="glass-panel game-card" style={{ 
                    width: '240px', height: '300px', display: 'flex', flexDirection: 'column',
                    transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
                    cursor: 'pointer', overflow: 'hidden'
                  }}>
                    <div style={{ height: '160px', background: 'linear-gradient(135deg, #004d40 0%, #00251a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '3rem' }}>🏦🃏</span>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <h3 style={{ fontSize: '1.1rem' }}>Baccarat</h3>
                      <p style={{ opacity: 0.7, fontSize: '0.8rem' }}>Player vs Banker</p>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold', fontSize: '0.9rem' }}>{user ? 'Play Now' : 'Log in to Play'}</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {category === 'Table Games' && enabledGames.includes('threecardpoker') && (
                <Link href={user ? "/games/threecardpoker" : "/login"} style={{ textDecoration: 'none' }}>
                  <div className="glass-panel game-card" style={{ 
                    width: '240px', height: '300px', display: 'flex', flexDirection: 'column',
                    transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
                    cursor: 'pointer', overflow: 'hidden'
                  }}>
                    <div style={{ height: '160px', background: 'linear-gradient(135deg, #4a148c 0%, #12005e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '3rem' }}>♣️♦️</span>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <h3 style={{ fontSize: '1.1rem' }}>Three Card Poker</h3>
                      <p style={{ opacity: 0.7, fontSize: '0.8rem' }}>Beat the Dealer's 3 Cards</p>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold', fontSize: '0.9rem' }}>{user ? 'Play Now' : 'Log in to Play'}</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {category === 'Arcade' && enabledGames.includes('crash') && (
                <Link href={user ? "/games/crash" : "/login"} style={{ textDecoration: 'none' }}>
                  <div className="glass-panel game-card" style={{ 
                    width: '240px', height: '300px', display: 'flex', flexDirection: 'column',
                    transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
                    cursor: 'pointer', overflow: 'hidden'
                  }}>
                    <div style={{ height: '160px', background: 'linear-gradient(135deg, #1a237e 0%, #000051 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '3rem' }}>🚀📈</span>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <h3 style={{ fontSize: '1.1rem' }}>Crash</h3>
                      <p style={{ opacity: 0.7, fontSize: '0.8rem' }}>Cash out before it blows!</p>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold', fontSize: '0.9rem' }}>{user ? 'Play Now' : 'Log in to Play'}</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {category === 'Arcade' && enabledGames.includes('keno') && (
                <Link href={user ? "/games/keno" : "/login"} style={{ textDecoration: 'none' }}>
                  <div className="glass-panel game-card" style={{ 
                    width: '240px', height: '300px', display: 'flex', flexDirection: 'column',
                    transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
                    cursor: 'pointer', overflow: 'hidden'
                  }}>
                    <div style={{ height: '160px', background: 'linear-gradient(135deg, #b71c1c 0%, #7f0000 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '3rem' }}>🎱🔮</span>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <h3 style={{ fontSize: '1.1rem' }}>Keno</h3>
                      <p style={{ opacity: 0.7, fontSize: '0.8rem' }}>Pick 10 Numbers and Win Big!</p>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold', fontSize: '0.9rem' }}>{user ? 'Play Now' : 'Log in to Play'}</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}
              {category === 'Arcade' && (
                <Link href={user ? "/games/bar" : "/login"} style={{ textDecoration: 'none' }}>
                  <div className="glass-panel game-card" style={{ 
                    width: '240px', height: '300px', display: 'flex', flexDirection: 'column',
                    transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
                    cursor: 'pointer', overflow: 'hidden'
                  }}>
                    <div style={{ height: '160px', background: 'linear-gradient(135deg, #4a0072 0%, #000000 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '3rem' }}>🍸🍻</span>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <h3 style={{ fontSize: '1.1rem' }}>The Bar</h3>
                      <p style={{ opacity: 0.7, fontSize: '0.8rem' }}>Time Management & Tips</p>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold', fontSize: '0.9rem' }}>{user ? 'Play Now' : 'Log in to Play'}</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Wallet & Group Play */}
      <div className="lobby-col">
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '60%' }}>
          <h2 style={{ marginBottom: '10px', fontSize: '1.2rem' }}>Money</h2>
          <div className="lobby-col-content">
            {user ? (
              <>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.9rem', opacity: 0.7, color: 'var(--neon-gold)' }}>Wallet</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--neon-gold)' }}>${user.credits.toLocaleString()}</div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '12px 0' }} />
                
                <button 
                  className="btn-primary" 
                  disabled={isProcessing}
                  onClick={handleBuyCoins}
                  style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #00ffcc 0%, #00cc99 100%)', color: '#000', fontWeight: 'bold' }}
                >
                  Buy $1,000 Coins
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', opacity: 0.7, marginTop: '40px' }}>
                <p>Please login to view your wallet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '40%' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>Library (Guides)</h2>
          <div className="lobby-col-content" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { title: 'How to play Slots', desc: 'Match symbols across the paylines. Orange fire symbols trigger the Jackpot wheel, and Blue lightning symbols give instant cash prizes!' },
              { title: 'Blackjack Strategy', desc: 'Always split Aces and 8s. Stand on 17. The dealer must hit on soft 17.' },
              { title: 'Craps Rules', desc: 'Bet on the Pass Line. 7 or 11 on the come-out roll is an instant win.' },
              { title: 'Bar Management', desc: 'Keep your casino customers happy! Serve drinks fast to earn massive tips and level up your establishment.' }
            ].map((guide, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--neon-blue)', cursor: 'pointer', transition: 'all 0.2s' }}
                   onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                   onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              >
                <h4 style={{ margin: '0 0 6px 0', color: 'var(--neon-blue)', fontSize: '0.95rem' }}>{guide.title}</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#ccc', lineHeight: '1.4' }}>{guide.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
