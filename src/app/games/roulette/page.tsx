'use client'

import { useUser } from '@/context/UserContext'
import { getActiveTables, createTable } from './actions'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import RouletteTableUI from './Table'

export default function RouletteLobby() {
  const { user } = useUser()
  const [tables, setTables] = useState<any[]>([])
  const [newTableName, setNewTableName] = useState('')
  const [currentTableId, setCurrentTableId] = useState<string | null>(null)

  useEffect(() => {
    fetchTables()
  }, [])

  const fetchTables = async () => {
    const t = await getActiveTables()
    setTables(t)
  }

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTableName) return
    const t = await createTable(newTableName)
    setNewTableName('')
    await fetchTables()
    setCurrentTableId(t.id)
  }

  if (!user) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', color: '#fff' }}>
        <h2>Please log in to play Roulette</h2>
        <Link href="/" style={{ color: '#00ffcc' }}>Return Home</Link>
      </div>
    )
  }

  if (currentTableId) {
    return <RouletteTableUI tableId={currentTableId} onLeave={() => setCurrentTableId(null)} />
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '3rem', margin: 0, color: '#ff3333', textShadow: '0 0 20px rgba(255,51,51,0.5)' }}>Roulette Lobby</h1>
        <Link href="/" className="btn-secondary">Return to Casino Floor</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px' }}>
        {/* Create Table Panel */}
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ marginTop: 0, color: '#ffcc00' }}>Host a Table</h2>
          <form onSubmit={handleCreateTable} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '10px' }}>Table Name</label>
              <input 
                type="text" 
                value={newTableName} 
                onChange={e => setNewTableName(e.target.value)}
                style={{ width: '100%', padding: '15px', borderRadius: '10px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid #333' }}
                placeholder="High Rollers Only..."
              />
            </div>
            <button type="submit" className="btn-primary" disabled={!newTableName}>Create & Join</button>
          </form>
        </div>

        {/* Active Tables List */}
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ marginTop: 0, color: '#00ffcc' }}>Active Tables</h2>
          {tables.length === 0 ? (
            <p style={{ color: '#aaa' }}>No active tables. Be the first to host one!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {tables.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '15px', border: '1px solid #333' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0' }}>{t.name}</h3>
                    <span style={{ fontSize: '0.9rem', color: t.status === 'SPINNING' ? '#ff3333' : '#00cc66' }}>{t.status}</span>
                  </div>
                  <button onClick={() => setCurrentTableId(t.id)} className="btn-primary" style={{ padding: '10px 20px', fontSize: '1rem' }}>
                    Join Table
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
