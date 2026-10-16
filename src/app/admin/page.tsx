'use client'

import { useState, useEffect } from 'react'
import { getAllUsers, updateUserBalance, toggleUserBan, getAuditLogs, getTransactions, toggleGameEnabled, getAdminConfig, createUser, deleteUser, getHouseStats, updateHouseBank, updateGameOdds, updateSportsApiKey, getPendingSportsBets, resolveSportsBet } from './actions'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'USERS' | 'AUDIT' | 'FINANCIALS' | 'CONFIG' | 'SPORTSBOOK'>('USERS')
  
  // Data States
  const [users, setUsers] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [txs, setTxs] = useState<any[]>([])
  const [config, setConfig] = useState<any>(null)
  const [houseStats, setHouseStats] = useState<any>(null)
  const [sportsBets, setSportsBets] = useState<any[]>([])
  
  // Game Odds Edit State
  const [oddsEdits, setOddsEdits] = useState<Record<string, { winRate?: number, freeSpinsRate?: number }>>({})
  
  // Sportsbook API Key State
  const [apiKeyInput, setApiKeyInput] = useState('')

  // Edit State
  const [houseBankAmount, setHouseBankAmount] = useState<number>(0)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editChips, setEditChips] = useState(0)

  // Create User State
  const [showCreate, setShowCreate] = useState(false)
  const [newUserData, setNewUserData] = useState({
    username: '',
    password: '',
    requiresPasswordReset: false,
    role: 'PLAYER',
    chipBalance: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [u, l, t, c, h, sb] = await Promise.all([
        getAllUsers(),
        getAuditLogs(),
        getTransactions(),
        getAdminConfig(),
        getHouseStats(),
        getPendingSportsBets()
      ])
      setUsers(u)
      setLogs(l)
      setTxs(t)
      setConfig(c)
      setHouseStats(h)
      setSportsBets(sb)
      setApiKeyInput(c.sportsApiKey || '')
    } catch (e) {
      console.error(e)
    }
  }

  const handleFundHouse = async (isDeposit: boolean) => {
    if (houseBankAmount <= 0) return
    await updateHouseBank(houseBankAmount, isDeposit)
    setHouseBankAmount(0)
    loadData()
  }

  const handleSaveBalance = async (userId: string) => {
    await updateUserBalance(userId, editChips)
    setEditingUserId(null)
    loadData()
  }

  const handleToggleGame = async (gameId: string) => {
    const enabledGames: string[] = JSON.parse(config.enabledGames)
    const isCurrentlyEnabled = enabledGames.includes(gameId)
    await toggleGameEnabled(gameId, !isCurrentlyEnabled)
    loadData()
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserData.username) return
    await createUser(newUserData)
    setShowCreate(false)
    setNewUserData({ username: '', password: '', requiresPasswordReset: false, role: 'PLAYER', chipBalance: 0 })
    loadData()
  }

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to permanently delete this user?')) {
      await deleteUser(userId)
      loadData()
    }
  }

  // `odds` lists the controls each game's server code actually reads from gameOdds.
  // Games with no odds hooks only get the enable/disable toggle.
  type OddsControl = 'win' | 'freeSpins'
  const GAMES_LIST: { id: string, name: string, category: string, odds: OddsControl[] }[] = [
    { id: 'frankenstein', name: 'Frankenstein', category: 'Slots', odds: ['win', 'freeSpins'] },
    { id: 'piggies', name: 'Piggies', category: 'Slots', odds: ['win', 'freeSpins'] },
    { id: 'buffalo', name: 'Buffalo', category: 'Slots', odds: [] },
    { id: 'blackjack', name: 'Blackjack', category: 'Table Games', odds: [] },
    { id: 'holdem', name: "Texas Hold'em", category: 'Table Games', odds: [] },
    { id: 'craps', name: 'Craps', category: 'Table Games', odds: [] },
    { id: 'roulette', name: 'Roulette', category: 'Table Games', odds: [] },
    { id: 'baccarat', name: 'Baccarat', category: 'Table Games', odds: [] },
    { id: 'threecardpoker', name: 'Three Card Poker', category: 'Table Games', odds: [] },
    { id: 'crash', name: 'Crash', category: 'Arcade', odds: [] },
    { id: 'keno', name: 'Keno', category: 'Arcade', odds: [] },
    { id: 'sportsbook', name: 'Sportsbook', category: 'Sports', odds: [] }
  ]

  return (
    <div style={{ display: 'flex', gap: '40px', height: '100%' }}>
      {/* Sidebar Tabs */}
      <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {['USERS', 'AUDIT', 'HOUSE BANK', 'CONFIG', 'SPORTSBOOK'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              padding: '15px 20px',
              textAlign: 'left',
              background: activeTab === tab ? 'rgba(255, 204, 0, 0.2)' : 'rgba(255,255,255,0.05)',
              color: activeTab === tab ? '#ffcc00' : '#fff',
              border: `1px solid ${activeTab === tab ? '#ffcc00' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="glass-panel" style={{ flex: 1, padding: '30px' }}>
        
        {/* USERS TAB */}
        {activeTab === 'USERS' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#ffcc00', margin: 0 }}>User Management</h2>
              <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
                {showCreate ? 'Cancel' : 'Create New User'}
              </button>
            </div>

            {showCreate && (
              <div style={{ background: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '10px', marginBottom: '20px', border: '1px solid var(--neon-gold)' }}>
                <h3 style={{ marginTop: 0 }}>Create User</h3>
                <form onSubmit={handleCreateUser} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label>Username</label>
                    <input required type="text" value={newUserData.username} onChange={e => setNewUserData({...newUserData, username: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: 'none', background: '#222', color: '#fff' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label>Password (optional)</label>
                    <input type="password" value={newUserData.password} onChange={e => setNewUserData({...newUserData, password: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: 'none', background: '#222', color: '#fff' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label>Requires Reset?</label>
                    <input type="checkbox" checked={newUserData.requiresPasswordReset} onChange={e => setNewUserData({...newUserData, requiresPasswordReset: e.target.checked})} style={{ width: '20px', height: '20px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label>Role</label>
                    <select value={newUserData.role} onChange={e => setNewUserData({...newUserData, role: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: 'none', background: '#222', color: '#fff' }}>
                      <option value="PLAYER">PLAYER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label>Starting Wallet</label>
                    <input type="number" value={newUserData.chipBalance} onChange={e => setNewUserData({...newUserData, chipBalance: Number(e.target.value)})} style={{ padding: '8px', borderRadius: '4px', border: 'none', background: '#222', color: '#fff', width: '100px' }} />
                  </div>
                  <button type="submit" className="btn-primary" style={{ padding: '8px 20px', height: 'fit-content' }}>Create</button>
                </form>
              </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>ID / Username</th>
                  <th style={{ padding: '10px' }}>Role</th>
                  <th style={{ padding: '10px' }}>Wallet</th>
                  <th style={{ padding: '10px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 'bold' }}>{u.username}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{u.id}</div>
                    </td>
                    <td style={{ padding: '10px', color: u.role === 'ADMIN' ? '#ff3366' : u.role === 'BANNED' ? '#aaa' : '#fff' }}>
                      {u.role}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {editingUserId === u.id ? (
                        <input type="number" value={editChips} onChange={e => setEditChips(Number(e.target.value))} style={{ width: '80px', background: '#333', color: '#fff', border: 'none', padding: '5px' }} />
                      ) : (
                        `$${(u.credits ?? 0).toLocaleString()}`
                      )}
                    </td>
                    <td style={{ padding: '10px', display: 'flex', gap: '10px' }}>
                      {editingUserId === u.id ? (
                        <>
                          <button onClick={() => handleSaveBalance(u.id)} className="btn-primary" style={{ padding: '5px 10px', fontSize: '0.8rem' }}>Save</button>
                          <button onClick={() => setEditingUserId(null)} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem' }}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => { setEditingUserId(u.id); setEditChips(u.credits ?? 0); }} 
                            className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                          >
                            Edit
                          </button>
                          {u.role !== 'ADMIN' && (
                            <button 
                              onClick={async () => { await toggleUserBan(u.id, u.role !== 'BANNED'); loadData(); }} 
                              className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem', color: u.role === 'BANNED' ? '#00cc66' : '#ff3366', borderColor: 'transparent' }}
                            >
                              {u.role === 'BANNED' ? 'Unban' : 'Ban'}
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem', color: '#ff3366', borderColor: '#ff3366' }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* AUDIT TAB */}
        {activeTab === 'AUDIT' && (
          <div>
            <h2 style={{ color: '#ffcc00', marginTop: 0 }}>Global Game Audit Ledger</h2>
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', textAlign: 'left', position: 'sticky', top: 0, background: '#111' }}>
                    <th style={{ padding: '10px' }}>Time</th>
                    <th style={{ padding: '10px' }}>User</th>
                    <th style={{ padding: '10px' }}>Game</th>
                    <th style={{ padding: '10px' }}>Bet</th>
                    <th style={{ padding: '10px' }}>Payout</th>
                    <th style={{ padding: '10px' }}>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const net = log.payout - log.betAmount
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px', opacity: 0.7 }}>{new Date(log.createdAt).toLocaleString()}</td>
                        <td style={{ padding: '10px' }}>{log.user.username}</td>
                        <td style={{ padding: '10px' }}>{log.gameType}</td>
                        <td style={{ padding: '10px' }}>${log.betAmount}</td>
                        <td style={{ padding: '10px', color: log.payout > 0 ? '#00cc66' : '#fff' }}>${log.payout}</td>
                        <td style={{ padding: '10px', color: net > 0 ? '#00cc66' : net < 0 ? '#ff3366' : '#888', fontWeight: 'bold' }}>
                          {net > 0 ? '+' : ''}{net}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {logs.length === 0 && <div style={{ padding: '20px', opacity: 0.5 }}>No game history recorded yet.</div>}
            </div>
          </div>
        )}

        {/* HOUSE BANK TAB */}
        {activeTab === 'FINANCIALS' && houseStats && (
          <div>
            <h2 style={{ color: '#ffcc00', marginTop: 0 }}>The House Bank & Vault</h2>
            
            {/* The Vault Display */}
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', border: '2px solid #ffcc00', marginBottom: '30px', background: 'linear-gradient(135deg, rgba(20,20,0,0.8), rgba(50,50,0,0.8))' }}>
              <h3 style={{ margin: '0 0 10px 0', opacity: 0.8, color: '#ffcc00' }}>HOUSE BANK BALANCE</h3>
              <div style={{ fontSize: '4rem', fontWeight: '900', color: '#ffcc00', textShadow: '0 0 20px rgba(255, 204, 0, 0.5)' }}>
                ${houseStats.houseBankBalance.toLocaleString()}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
                <span style={{ fontSize: '1.5rem', color: '#ffcc00' }}>$</span>
                <input 
                  type="number" 
                  value={houseBankAmount || ''} 
                  onChange={e => setHouseBankAmount(Number(e.target.value))}
                  style={{ width: '200px', padding: '10px', fontSize: '1.2rem', background: 'rgba(0,0,0,0.5)', border: '1px solid #ffcc00', color: '#fff', borderRadius: '8px' }} 
                  placeholder="Amount"
                />
                <button onClick={() => handleFundHouse(true)} className="btn-primary" style={{ padding: '10px 20px', fontWeight: 'bold' }}>Fund Vault</button>
                <button onClick={() => handleFundHouse(false)} className="btn-secondary" style={{ padding: '10px 20px', fontWeight: 'bold', color: '#ff3366', borderColor: '#ff3366' }}>Withdraw</button>
              </div>
            </div>

            {/* Financial Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
              <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(255, 51, 102, 0.3)' }}>
                <div style={{ opacity: 0.7, marginBottom: '5px' }}>Total Player Liability (Outstanding Chips)</div>
                <div style={{ fontSize: '2rem', color: '#ff3366', fontWeight: 'bold' }}>
                  {houseStats.playerLiability.toLocaleString()}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(0, 204, 102, 0.3)' }}>
                <div style={{ opacity: 0.7, marginBottom: '5px' }}>Net Gaming Profit</div>
                <div style={{ fontSize: '2rem', color: houseStats.netProfit >= 0 ? '#00cc66' : '#ff3366', fontWeight: 'bold' }}>
                  ${houseStats.netProfit.toLocaleString()}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(0, 204, 102, 0.3)' }}>
                <div style={{ opacity: 0.7, marginBottom: '5px' }}>Total Fiat Deposited</div>
                <div style={{ fontSize: '2rem', color: '#00cc66', fontWeight: 'bold' }}>
                  ${houseStats.totalDeposits.toLocaleString()}
                </div>
              </div>
            </div>

            <h3 style={{ color: '#fff', opacity: 0.8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>Fiat Deposit Logs</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Time</th>
                  <th style={{ padding: '10px' }}>User</th>
                  <th style={{ padding: '10px' }}>Type</th>
                  <th style={{ padding: '10px' }}>Amount (USD)</th>
                  <th style={{ padding: '10px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {txs.map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px', opacity: 0.7 }}>{new Date(tx.createdAt).toLocaleString()}</td>
                    <td style={{ padding: '10px' }}>{tx.user.username}</td>
                    <td style={{ padding: '10px' }}>{tx.type}</td>
                    <td style={{ padding: '10px', color: '#00cc66', fontWeight: 'bold' }}>${tx.amount.toFixed(2)}</td>
                    <td style={{ padding: '10px' }}>{tx.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {txs.length === 0 && <div style={{ padding: '20px', opacity: 0.5 }}>No transactions found.</div>}
          </div>
        )}

        {/* CONFIG TAB */}
        {activeTab === 'CONFIG' && config && (
          <div>
            <h2 style={{ color: '#ffcc00', marginTop: 0 }}>Game Configuration & Toggles</h2>
            <p style={{ opacity: 0.7, marginBottom: '30px' }}>Disable games to hide them from the Casino Floor. Existing tables will resolve, but no new tables can be created.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
              {GAMES_LIST.map(game => {
                const isEnabled = JSON.parse(config.enabledGames).includes(game.id)
                return (
                  <div key={game.id} style={{ background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '15px', border: `1px solid ${isEnabled ? 'rgba(0, 204, 102, 0.3)' : 'rgba(255, 51, 102, 0.3)'}` }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{game.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: isEnabled ? '#00cc66' : '#ff3366', fontSize: '0.9rem' }}>{isEnabled ? 'ONLINE' : 'OFFLINE'}</span>
                      <button 
                        onClick={() => handleToggleGame(game.id)}
                        style={{
                          background: isEnabled ? '#ff3366' : '#00cc66',
                          color: '#fff', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
                        }}
                      >
                        {isEnabled ? 'DISABLE' : 'ENABLE'}
                      </button>
                    </div>

                    <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)' }} />

                    {(() => {
                      const stored = JSON.parse(config.gameOdds || '{}')
                      const saved = stored[game.id] ?? (game.category === 'Slots' ? stored.slots : undefined) ?? {}
                      const win = oddsEdits[game.id]?.winRate ?? saved.winRate ?? 1.0
                      const fs = oddsEdits[game.id]?.freeSpinsRate ?? saved.freeSpinsRate ?? 1.0
                      const commit = () => updateGameOdds(game.id, win, fs)

                      if (game.odds.length === 0) {
                        return <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>No adjustable odds for this game.</div>
                      }

                      const sliders: { key: 'winRate' | 'freeSpinsRate', label: string, value: number, color: string }[] = []
                      if (game.odds.includes('win')) sliders.push({ key: 'winRate', label: 'Win Multiplier', value: win, color: '#ffcc00' })
                      if (game.odds.includes('freeSpins')) sliders.push({ key: 'freeSpinsRate', label: 'Free Spins Multiplier', value: fs, color: '#00cc66' })

                      return sliders.map(s => (
                        <div key={s.key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label htmlFor={`odds-${game.id}-${s.key}`} style={{ fontSize: '0.8rem', opacity: 0.8 }}>{s.label}:</label>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{s.value.toFixed(1)}x</div>
                          </div>
                          <input
                            id={`odds-${game.id}-${s.key}`}
                            type="range" step="0.1" min="0.1" max="3.0"
                            value={s.value}
                            onChange={e => setOddsEdits(prev => ({ ...prev, [game.id]: { ...prev[game.id], [s.key]: parseFloat(e.target.value) } }))}
                            onPointerUp={commit}
                            onKeyUp={commit}
                            style={{ width: '100%', accentColor: s.color, cursor: 'pointer' }}
                          />
                        </div>
                      ))
                    })()}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* SPORTSBOOK TAB */}
        {activeTab === 'SPORTSBOOK' && (
          <div>
            <h2 style={{ color: '#ffcc00', marginTop: 0 }}>Sportsbook Management</h2>
            
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '30px', border: '1px solid #ffcc00' }}>
              <h3 style={{ marginTop: 0, color: '#ffcc00' }}>Live Odds API Configuration</h3>
              <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>Enter your API key from <a href="https://the-odds-api.com" target="_blank" style={{color:'#00ffff'}}>the-odds-api.com</a> to switch from mocked data to real live odds.</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="password" 
                  value={apiKeyInput} 
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="Paste API Key here..."
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', background: 'rgba(0,0,0,0.5)', color: '#fff' }}
                />
                <button 
                  onClick={async () => { await updateSportsApiKey(apiKeyInput); alert('API Key Saved! The sportsbook is now live.'); loadData(); }} 
                  className="btn-primary"
                >
                  Save API Key
                </button>
              </div>
            </div>

            <h3 style={{ color: '#fff', opacity: 0.8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>Pending Bets Dashboard</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Time Placed</th>
                  <th style={{ padding: '10px' }}>User</th>
                  <th style={{ padding: '10px' }}>Sport</th>
                  <th style={{ padding: '10px' }}>Match & Pick</th>
                  <th style={{ padding: '10px' }}>Bet / Odds</th>
                  <th style={{ padding: '10px' }}>To Win</th>
                  <th style={{ padding: '10px' }}>Resolve</th>
                </tr>
              </thead>
              <tbody>
                {sportsBets.map(bet => {
                  const toWin = Math.floor(bet.amount * bet.odds)
                  return (
                    <tr key={bet.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px', opacity: 0.7 }}>{new Date(bet.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '10px' }}>User ID: {bet.userId.substring(0,6)}...</td>
                      <td style={{ padding: '10px', textTransform: 'capitalize' }}>{bet.sportKey}</td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{bet.eventId}</div>
                        <div style={{ fontWeight: 'bold' }}>{bet.team}</div>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div>${bet.amount}</div>
                        <div style={{ color: '#aaa', fontSize: '0.8rem' }}>{bet.odds}x</div>
                      </td>
                      <td style={{ padding: '10px', color: '#00cc66', fontWeight: 'bold' }}>
                        ${toWin}
                      </td>
                      <td style={{ padding: '10px', display: 'flex', gap: '10px' }}>
                        <button 
                          onClick={async () => { await resolveSportsBet(bet.id, true); loadData(); }}
                          className="btn-primary" style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#00cc66' }}
                        >
                          Mark Won
                        </button>
                        <button 
                          onClick={async () => { await resolveSportsBet(bet.id, false); loadData(); }}
                          className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem', color: '#ff3366', borderColor: '#ff3366' }}
                        >
                          Mark Lost
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {sportsBets.length === 0 && <div style={{ padding: '20px', opacity: 0.5 }}>No pending sports bets.</div>}
          </div>
        )}

      </div>
    </div>
  )
}
