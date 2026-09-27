'use client'

import { useUser } from '@/context/UserContext'
import { getActiveTables, createTable } from './actions'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import CrapsTableUI from './Table'

export default function CrapsLobby() {
  const { user } = useUser()
  const [tables, setTables] = useState<any[]>([])
  const [currentTableId, setCurrentTableId] = useState<string | null>(null)
  const [newTableName, setNewTableName] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchTables = () => {
    getActiveTables().then(t => setTables(t)).catch(console.error)
  }

  useEffect(() => {
    if (!user) return
    fetchTables()
    const intv = setInterval(fetchTables, 3000)
    return () => clearInterval(intv)
  }, [user, currentTableId])

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTableName.trim()) return
    setIsProcessing(true)
    try {
      const table = await createTable(newTableName)
      setCurrentTableId(table.id)
      setNewTableName('')
    } catch (e: any) {
      setErrorMsg(e.message)
    }
    setIsProcessing(false)
  }

  const handleJoinTable = async (tableId: string) => {
    setCurrentTableId(tableId)
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <h2 style={{ marginBottom: '16px' }}>Please login to play</h2>
        <Link href="/" className="btn-primary">Return to Lobby</Link>
      </div>
    )
  }

  if (currentTableId) {
    return <CrapsTableUI tableId={currentTableId} onLeave={() => setCurrentTableId(null)} />
  }

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      minHeight: 'calc(100vh - 100px)', padding: '40px',
      background: 'radial-gradient(circle at 50% 50%, #1a1a1a 0%, #000 100%)',
      color: '#fff'
    }}>
      <h1 style={{ fontSize: '3rem', color: '#00ffaa', marginBottom: '40px', letterSpacing: '2px' }}>CRAPS LOBBY</h1>
      
      {errorMsg && <div style={{ color: '#ff3333', marginBottom: '20px', padding: '10px', border: '1px solid #ff3333', borderRadius: '8px' }}>{errorMsg}</div>}

      <div style={{ display: 'flex', gap: '40px', width: '100%', maxWidth: '1000px' }}>
        {/* Active Tables List */}
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(0,255,170,0.3)' }}>
          <h2 style={{ color: '#00ffaa', marginBottom: '20px', borderBottom: '1px solid rgba(0,255,170,0.3)', paddingBottom: '10px' }}>ACTIVE TABLES</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tables.length === 0 && <div style={{ opacity: 0.5 }}>No active tables. Create one!</div>}
            
            {tables.map(table => {
              const activeBets = JSON.parse(table.activeBets || '[]')
              // Count unique users who have active bets
              const uniquePlayers = new Set(activeBets.map((b:any) => b.userId)).size

              return (
                <div key={table.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#fff' }}>{table.name}</div>
                    <div style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '4px' }}>
                      Status: {table.status} {table.point ? `(Point: ${table.point})` : ''} | Players betting: {uniquePlayers}
                    </div>
                  </div>
                  <button 
                    className="btn-primary" 
                    onClick={() => handleJoinTable(table.id)}
                    disabled={isProcessing}
                  >
                    JOIN TABLE
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Create Table Panel */}
        <div style={{ width: '300px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(0,255,170,0.3)' }}>
          <h2 style={{ color: '#00ffaa', marginBottom: '20px', borderBottom: '1px solid rgba(0,255,170,0.3)', paddingBottom: '10px' }}>CREATE TABLE</h2>
          <form onSubmit={handleCreateTable} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input 
              type="text" 
              placeholder="Table Name (e.g. High Rollers)" 
              value={newTableName} 
              onChange={e => setNewTableName(e.target.value)}
              style={{ padding: '12px', borderRadius: '8px', border: 'none', outline: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
              required
            />
            <button type="submit" className="btn-primary" disabled={isProcessing || !newTableName.trim()}>
              CREATE & JOIN
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
