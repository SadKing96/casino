'use client'

import { useUser } from '@/context/UserContext'
import { getActiveTables, createTable } from './actions'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import ThreeCardPokerTableUI from './Table'

export default function ThreeCardPokerLobby() {
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
        <h2>Please log in to play Three Card Poker</h2>
        <Link href="/" style={{ color: '#00ffcc' }}>Return Home</Link>
      </div>
    )
  }

  if (activeTableId) {
    return <ThreeCardPokerTableUI tableId={activeTableId} onLeave={() => setActiveTableId(null)} />
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '3rem', margin: 0, color: '#aa00ff', textShadow: '0 0 20px rgba(170,0,255,0.5)' }}>Three Card Poker</h1>
        <Link href="/" className="btn-secondary">Return to Casino Floor</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px' }}>
        {/* Create Table Panel */}
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ marginTop: 0, color: '#ffcc00' }}>Host a Table</h2>
          <p style={{ opacity: 0.7, marginBottom: '20px' }}>Start a fresh 3 Card Poker table.</p>
          <button 
            className="btn-primary" 
            onClick={handleCreateTable}
            disabled={isCreating}
            style={{ width: '100%' }}
          >
            {isCreating ? 'Creating...' : 'Create & Join'}
          </button>
        </div>

        {/* Active Tables List */}
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ marginTop: 0, color: '#00ffcc' }}>Active Tables</h2>
          {tables.length === 0 ? (
            <p style={{ color: '#aaa' }}>No active tables found. Be the first to host one!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {tables.map(table => {
                const playerHands = JSON.parse(table.playerHands)
                const playerCount = Object.keys(playerHands).length
                return (
                  <div key={table.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '15px', border: '1px solid #333' }}>
                    <div>
                      <h3 style={{ margin: '0 0 5px 0' }}>{table.name}</h3>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: table.status === 'ANTE' ? '#00cc66' : '#ff3333' }}>{table.status}</span>
                        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>({playerCount} Players)</span>
                      </div>
                    </div>
                    <button onClick={() => setActiveTableId(table.id)} className="btn-primary" style={{ padding: '10px 20px', fontSize: '1rem' }}>
                      Join Table
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
