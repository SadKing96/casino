'use client'

import { useUser } from '@/context/UserContext'
import { getActiveTables, createTable } from './actions'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import CrashTableUI from './Table'

export default function CrashLobby() {
  const { user } = useUser()
  const [tables, setTables] = useState<any[]>([])
  const [activeTableId, setActiveTableId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadTables()
    const interval = setInterval(loadTables, 3000)
    return () => clearInterval(interval)
  }, [activeTableId])

  const loadTables = async () => {
    if (activeTableId) return 
    const active = await getActiveTables()
    setTables(active)
  }

  const handleCreateTable = async () => {
    if (!user) return
    setIsCreating(true)
    try {
      const table = await createTable()
      setActiveTableId(table.id)
    } catch (e) {
      console.error(e)
    }
    setIsCreating(false)
  }

  if (!user) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', color: '#fff' }}>
        <h2>Please log in to play Crash</h2>
        <Link href="/" style={{ color: '#00ffcc' }}>Return Home</Link>
      </div>
    )
  }

  if (activeTableId) {
    return <CrashTableUI tableId={activeTableId} onLeave={() => setActiveTableId(null)} />
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '3rem', margin: 0, color: '#00e5ff', textShadow: '0 0 20px rgba(0,229,255,0.5)' }}>Crash Lounge</h1>
        <Link href="/" className="btn-secondary">Return to Casino Floor</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px' }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ marginTop: 0, color: '#ffcc00' }}>Host a Game</h2>
          <p style={{ opacity: 0.7, marginBottom: '20px' }}>Start a fresh Crash session.</p>
          <button 
            className="btn-primary" 
            onClick={handleCreateTable}
            disabled={isCreating}
            style={{ width: '100%' }}
          >
            {isCreating ? 'Creating...' : 'Create & Join'}
          </button>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ marginTop: 0, color: '#00ffcc' }}>Active Games</h2>
          {tables.length === 0 ? (
            <p style={{ color: '#aaa' }}>No active games found. Be the first to host one!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {tables.map(table => {
                const activeBets = JSON.parse(table.activeBets)
                const playerCount = Object.keys(activeBets).length
                return (
                  <div key={table.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '15px', border: '1px solid #333' }}>
                    <div>
                      <h3 style={{ margin: '0 0 5px 0' }}>Crash Lounge #{table.id.slice(-4)}</h3>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: table.status === 'BETTING' ? '#00cc66' : table.status === 'IN_FLIGHT' ? '#00e5ff' : '#ff3333' }}>{table.status}</span>
                        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>({playerCount} Bets)</span>
                      </div>
                    </div>
                    <button onClick={() => setActiveTableId(table.id)} className="btn-primary" style={{ padding: '10px 20px', fontSize: '1rem' }}>
                      Join Game
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
