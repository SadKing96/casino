'use client'

import { useState, useEffect } from 'react'
import { SportsEvent } from '@/lib/sports'
import { placeBet, getMyBets } from './actions'
import { useUser } from '@/context/UserContext'

export default function SportsbookClient({ initialEvents, initialSport }: { initialEvents: SportsEvent[], initialSport: string }) {
  const { user } = useUser()
  const [events, setEvents] = useState<SportsEvent[]>(initialEvents)
  const [sportKey, setSportKey] = useState(initialSport)
  const [betSlip, setBetSlip] = useState<{ event: SportsEvent, team: string, odds: number, amount: number } | null>(null)
  const [myBets, setMyBets] = useState<any[]>([])
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [isBetSlipOpen, setIsBetSlipOpen] = useState(false)

  useEffect(() => {
    getMyBets().then(setMyBets)
  }, [])

  const handleSelectBet = (event: SportsEvent, team: string, odds: number) => {
    setBetSlip({ event, team, odds, amount: 100 })
    setIsBetSlipOpen(true) // auto-open when they select
  }

  const handlePlaceBet = async () => {
    if (!betSlip) return
    setPlacing(true)
    setError('')
    try {
      await placeBet(betSlip.event.id, betSlip.event.sport_key, betSlip.team, betSlip.odds, betSlip.amount)
      setBetSlip(null)
      setIsBetSlipOpen(false) // close on success
      
      const bets = await getMyBets()
      setMyBets(bets)
    } catch (e: any) {
      setError(e.message || "Failed to place bet")
    }
    setPlacing(false)
  }

  const sports = [
    { key: 'americanfootball_nfl', name: 'NFL' },
    { key: 'basketball_nba', name: 'NBA' },
    { key: 'soccer_epl', name: 'Premier League' }
  ]

  const mockPlayByPlay = [
    {
      sport: 'NFL',
      teams: 'Chiefs vs Ravens',
      score: 'KC 24 - BAL 20',
      time: '4th Qtr 2:15',
      update: 'Mahomes passes deep right to Kelce for 25 yards to the BAL 30.',
      color: '#ff3366',
      icon: '🏈'
    },
    {
      sport: 'NBA',
      teams: 'Lakers vs Celtics',
      score: 'LAL 105 - BOS 102',
      time: '3rd Qtr 8:40',
      update: 'LeBron James makes a 28-foot three-point jumper. Assist by Russell.',
      color: '#ffcc00',
      icon: '🏀'
    },
    {
      sport: 'Soccer',
      teams: 'Arsenal vs Chelsea',
      score: 'ARS 2 - CHE 1',
      time: '75\'',
      update: 'Goal! Bukayo Saka shoots with left foot from the center of the box to the bottom right corner.',
      color: '#00e5ff',
      icon: '⚽'
    },
    {
      sport: 'MLB',
      teams: 'Yankees vs Red Sox',
      score: 'NYY 5 - BOS 3',
      time: 'Top 8th',
      update: 'Aaron Judge hits a 415ft home run to left center. Soto scores.',
      color: '#00cc66',
      icon: '⚾'
    }
  ]

  return (
    <div style={{ display: 'flex', gap: '30px', padding: '20px', minHeight: '80vh', color: '#fff', width: '100%' }}>
      
      {/* 1. Left Sidebar (Sports & My Bets) */}
      <div style={{ width: '250px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Sports</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sports.map(s => (
              <button 
                key={s.key} 
                className={`btn-secondary ${sportKey === s.key ? 'btn-primary' : ''}`}
                onClick={() => window.location.href = `/games/sportsbook?sport=${s.key}`}
                style={{ textAlign: 'left', padding: '10px' }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>My Active Bets</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
            {myBets.filter(b => b.status === 'PENDING').map(b => (
              <div key={b.id} style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--neon-gold)' }}>{b.team}</div>
                <div style={{ marginTop: '4px' }}>Odds: <span style={{color: '#fff'}}>{b.odds.toFixed(2)}</span> | Wager: <span style={{color: '#fff'}}>{b.amount}</span></div>
                <div style={{ opacity: 0.8, fontSize: '0.85rem', marginTop: '5px', color: '#4caf50', fontWeight: 'bold' }}>To Win: {Math.floor(b.amount * b.odds)}</div>
              </div>
            ))}
            {myBets.filter(b => b.status === 'PENDING').length === 0 && <div style={{ opacity: 0.5 }}>No active bets.</div>}
          </div>
        </div>
      </div>

      {/* 2. Center Column (Play-by-Play Grid) */}
      <div style={{ flex: '1.8', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ margin: '0 0 10px 0', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Live Play-by-Play Tracker</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {mockPlayByPlay.map(game => (
            <div key={game.teams} className="glass-panel" style={{ 
              borderTop: `4px solid ${game.color}`, 
              padding: '20px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '15px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ fontSize: '0.8rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px' }}>{game.sport} {game.icon}</span>
                 <span style={{ color: '#ff3366', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,51,102,0.1)', padding: '4px 8px', borderRadius: '12px' }}>
                   <span style={{ width: '6px', height: '6px', background: '#ff3366', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #ff3366' }}></span>
                   LIVE
                 </span>
               </div>
               <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ddd' }}>{game.teams}</div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
                 <span style={{ fontSize: '1.6rem', fontWeight: '900', color: game.color, textShadow: `0 0 10px ${game.color}40` }}>{game.score}</span>
                 <span style={{ color: '#fff', fontWeight: 'bold', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{game.time}</span>
               </div>
               <div style={{ background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '8px', fontSize: '0.9rem', lineHeight: '1.4', fontStyle: 'italic', borderLeft: `3px solid ${game.color}`, color: '#ccc' }}>
                 "{game.update}"
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Right Column (Live Odds) */}
      <div style={{ flex: '1.5', minWidth: '550px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ margin: '0', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Live Odds Feed</h2>
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', padding: '10px 15px', borderBottom: '1px solid #333', background: '#222', fontSize: '0.8rem', color: '#aaa', fontWeight: 'bold' }}>
            <div></div>
            <div style={{ textAlign: 'center' }}>SPREAD</div>
            <div style={{ textAlign: 'center' }}>TOTAL</div>
            <div style={{ textAlign: 'center' }}>MONEY LINE</div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '70vh', overflowY: 'auto' }}>
            {events.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>No events available.</div>
            ) : events.map((ev, idx) => {
              const bookmaker = ev.bookmakers[0]
              if (!bookmaker) return null

              const h2h = bookmaker.markets.find(m => m.key === 'h2h')
              const spreads = bookmaker.markets.find(m => m.key === 'spreads')
              const totals = bookmaker.markets.find(m => m.key === 'totals')
              
              if (!h2h) return null
              
              const dt = new Date(ev.commence_time)
              const timeStr = dt.toLocaleString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
              const homeML = h2h.outcomes.find(o => o.name === ev.home_team)?.price || 0
              const awayML = h2h.outcomes.find(o => o.name === ev.away_team)?.price || 0
              
              const homeSpread = spreads?.outcomes.find(o => o.name === ev.home_team)
              const awaySpread = spreads?.outcomes.find(o => o.name === ev.away_team)

              const overTotal = totals?.outcomes.find(o => o.name === 'Over')
              const underTotal = totals?.outcomes.find(o => o.name === 'Under')

              const formatOdds = (val: number) => {
                  if (!val) return ''
                  return val > 0 ? `+${val}` : `${val}`
              }
              const getColor = (val: number) => {
                  if (!val) return '#fff'
                  return val > 0 ? '#4caf50' : '#f44336'
              }

              const bg = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)'

              return (
                <div key={ev.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', padding: '15px', borderBottom: '1px solid #333', background: bg, alignItems: 'center' }}>
                  {/* Date & Teams */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#ffcc00', fontWeight: 'bold', textTransform: 'uppercase' }}>{timeStr}</div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', textTransform: 'uppercase' }}>{ev.home_team}</div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', textTransform: 'uppercase' }}>{ev.away_team}</div>
                  </div>

                  {/* Spread */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', fontSize: '0.95rem' }}>
                    <div style={{ opacity: 0, fontSize: '0.75rem' }}>-</div>
                    <button onClick={() => homeSpread && handleSelectBet(ev, `${ev.home_team} ${formatOdds(homeSpread.point || 0)}`, homeSpread.price)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', gap: '15px' }}>
                       <span style={{ color: '#ccc' }}>{homeSpread ? formatOdds(homeSpread.point || 0) : '-'}</span>
                       <span style={{ color: getColor(homeSpread?.price || 0) }}>{formatOdds(homeSpread?.price || 0)}</span>
                    </button>
                    <button onClick={() => awaySpread && handleSelectBet(ev, `${ev.away_team} ${formatOdds(awaySpread.point || 0)}`, awaySpread.price)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', gap: '15px' }}>
                       <span style={{ color: '#ccc' }}>{awaySpread ? formatOdds(awaySpread.point || 0) : '-'}</span>
                       <span style={{ color: getColor(awaySpread?.price || 0) }}>{formatOdds(awaySpread?.price || 0)}</span>
                    </button>
                  </div>

                  {/* Total */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', fontSize: '0.95rem' }}>
                    <div style={{ opacity: 0, fontSize: '0.75rem' }}>-</div>
                    <button onClick={() => overTotal && handleSelectBet(ev, `Over ${overTotal.point}`, overTotal.price)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', gap: '15px' }}>
                       <span style={{ color: '#ccc' }}>{overTotal ? `O ${overTotal.point}` : '-'}</span>
                       <span style={{ color: getColor(overTotal?.price || 0) }}>{formatOdds(overTotal?.price || 0)}</span>
                    </button>
                    <button onClick={() => underTotal && handleSelectBet(ev, `Under ${underTotal.point}`, underTotal.price)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', gap: '15px' }}>
                       <span style={{ color: '#ccc' }}>{underTotal ? `U ${underTotal.point}` : '-'}</span>
                       <span style={{ color: getColor(underTotal?.price || 0) }}>{formatOdds(underTotal?.price || 0)}</span>
                    </button>
                  </div>

                  {/* ML */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', fontSize: '0.95rem' }}>
                    <div style={{ opacity: 0, fontSize: '0.75rem' }}>-</div>
                    <button onClick={() => handleSelectBet(ev, `${ev.home_team} ML`, homeML)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: getColor(homeML) }}>
                      {formatOdds(homeML)}
                    </button>
                    <button onClick={() => handleSelectBet(ev, `${ev.away_team} ML`, awayML)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: getColor(awayML) }}>
                      {formatOdds(awayML)}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 4. Pop-Up Bet Slip */}
      {isBetSlipOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
          {/* Click-away Backdrop */}
          <div 
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }} 
            onClick={() => setIsBetSlipOpen(false)}
          ></div>

          {/* Bet Slip Panel */}
          <div className="glass-panel" style={{ 
            position: 'relative', zIndex: 10000, 
            width: '350px', margin: '20px', padding: '25px', 
            background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '20px', border: '2px solid var(--neon-gold)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,215,0,0.3)', paddingBottom: '15px', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: 'var(--neon-gold)' }}>BET SLIP</h3>
              <button onClick={() => setIsBetSlipOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            
            {!betSlip ? (
              <div style={{ color: '#aaa', textAlign: 'center', padding: '30px 0' }}>Click an odd to add to your bet slip.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{betSlip.event.home_team} vs {betSlip.event.away_team}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.3rem', marginTop: '8px', color: '#fff' }}>{betSlip.team}</div>
                  <div style={{ marginTop: '8px', fontSize: '0.9rem' }}>Odds: <span style={{ fontWeight: 'bold', color: 'var(--neon-gold)', fontSize: '1.1rem' }}>{betSlip.odds.toFixed(2)}</span></div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: '#aaa' }}>Wager Amount (Credits)</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#000', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', padding: '5px' }}>
                    <span style={{ padding: '0 10px', color: 'var(--neon-gold)', fontWeight: 'bold' }}>$</span>
                    <input 
                      type="number" 
                      value={betSlip.amount} 
                      onChange={e => setBetSlip({ ...betSlip, amount: parseInt(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '10px', border: 'none', background: 'transparent', color: '#fff', fontSize: '1.2rem', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
                  <span style={{ fontSize: '1.1rem' }}>To Win:</span>
                  <span style={{ fontWeight: 'bold', color: '#4caf50', fontSize: '1.2rem' }}>${Math.floor(betSlip.amount * betSlip.odds)}</span>
                </div>

                {error && <div style={{ color: '#f44336', fontSize: '0.9rem', textAlign: 'center', background: 'rgba(244, 67, 54, 0.1)', padding: '10px', borderRadius: '6px' }}>{error}</div>}

                <button 
                  className="btn-primary" 
                  onClick={handlePlaceBet}
                  disabled={placing || betSlip.amount <= 0 || (user?.credits || 0) < betSlip.amount}
                  style={{ width: '100%', padding: '16px', fontSize: '1.2rem', marginTop: '10px', fontWeight: 'bold', borderRadius: '10px' }}
                >
                  {placing ? 'Placing Bet...' : 'PLACE BET'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) for Betslip */}
      {!isBetSlipOpen && (
        <button 
          onClick={() => setIsBetSlipOpen(true)}
          style={{
            position: 'fixed', bottom: '40px', right: '40px', zIndex: 9998,
            background: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)', color: '#000', border: 'none',
            borderRadius: '50px', padding: '15px 30px', display: 'flex', alignItems: 'center', gap: '10px',
            fontWeight: '900', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 10px 30px rgba(255, 215, 0, 0.5)',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ fontSize: '1.4rem' }}>📝</span>
          BET SLIP {betSlip ? '(1)' : '(0)'}
        </button>
      )}
    </div>
  )
}
