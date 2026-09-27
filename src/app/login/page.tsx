'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { loginWithPassword, loginAsGuest } from '@/app/actions'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isQuickAdmin, setIsQuickAdmin] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { setUser } = useUser()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    try {
      const user = await loginWithPassword(username, password, rememberMe)
      setUser(user)
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGuest = async () => {
    setError('')
    setIsLoading(true)
    try {
      const user = await loginAsGuest(isQuickAdmin)
      setUser(user)
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Guest login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-panel" style={{ padding: '40px', maxWidth: '400px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h1 className="text-gradient-gold" style={{ margin: 0, textAlign: 'center', fontSize: '2.5rem' }}>KINGZ CASINO</h1>
        <h2 style={{ margin: 0, textAlign: 'center', color: '#fff', opacity: 0.8, fontSize: '1.2rem' }}>Welcome Back</h2>
        
        {error && (
          <div style={{ background: 'rgba(255, 51, 102, 0.2)', border: '1px solid #ff3366', color: '#ff3366', padding: '10px', borderRadius: '4px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ color: '#fff' }}>Username</label>
            <input 
              required 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{ padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '1rem' }}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ color: '#fff' }}>Password</label>
            <input 
              required 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '1rem' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox" 
              id="remember"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            <label htmlFor="remember" style={{ color: '#fff', opacity: 0.8 }}>Stay logged in</label>
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary" style={{ padding: '12px', fontSize: '1.1rem', fontWeight: 'bold', marginTop: '10px' }}>
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {process.env.NODE_ENV !== 'production' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0' }}>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', flex: 1 }}></div>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>QUICK PLAY (DEV ONLY)</span>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', flex: 1 }}></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <input 
                  type="checkbox" 
                  id="quickAdmin"
                  checked={isQuickAdmin}
                  onChange={e => setIsQuickAdmin(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <label htmlFor="quickAdmin" style={{ color: '#fff', opacity: 0.8, fontSize: '0.9rem' }}>Create as Admin Account</label>
              </div>

              <button type="button" onClick={handleGuest} disabled={isLoading} className="btn-secondary" style={{ padding: '12px', fontSize: '1.1rem', fontWeight: 'bold', width: '100%', border: '1px solid var(--neon-gold)' }}>
                Play as {isQuickAdmin ? 'Admin' : 'Guest'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
