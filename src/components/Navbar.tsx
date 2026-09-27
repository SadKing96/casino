'use client'

import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import { loginAsGuest } from '@/app/actions'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

export function Navbar() {
  const { user, setUser, logout } = useUser()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const pathname = usePathname()
  
  const isGame = pathname.startsWith('/games/')
  let backCategory = 'Slots'
  if (['/blackjack', '/holdem', '/craps', '/roulette', '/baccarat', '/threecardpoker'].some(p => pathname.includes(p))) {
    backCategory = 'Table Games'
  } else if (['/crash', '/keno'].some(p => pathname.includes(p))) {
    backCategory = 'Arcade'
  }

  const handleGuestLogin = async () => {
    setIsLoggingIn(true)
    const newUser = await loginAsGuest()
    setUser(newUser)
    setIsLoggingIn(false)
  }

  return (
    <nav className="glass-panel" style={{ margin: '24px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Link href="/" style={{ fontSize: '1.5rem', fontWeight: 'bold' }} className="text-gradient-gold">
          KINGZ CASINO
        </Link>
        {isGame && (
          <Link 
            href={`/?category=${backCategory.replace(' ', '+')}`}
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--neon-gold)', color: 'var(--neon-gold)' }}
          >
            <span>←</span> Return to Lobby
          </Link>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {user ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--foreground)' }}>{user.username}</span>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--neon-gold)', color: 'var(--neon-gold)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>💰 Chips:</span> {user.chipBalance.toLocaleString()}
              </div>
            </div>

            {user.role === 'ADMIN' && (
              <Link href="/admin" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem', textDecoration: 'none', border: '1px solid #ffcc00', color: '#ffcc00' }}>Admin Panel</Link>
            )}

            <Link href="/bank" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem', textDecoration: 'none' }}>Bank</Link>

            <button onClick={logout} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem', border: 'none' }}>Logout</button>
          </>
        ) : (
          <Link 
            href="/login"
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.9rem', textDecoration: 'none' }}
          >
            Log In
          </Link>
        )}
      </div>
    </nav>
  )
}
