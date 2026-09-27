'use client'

import { useState } from 'react'
import { updatePassword } from '@/app/actions'
import { useUser } from '@/context/UserContext'

export function ForcePasswordReset() {
  const { user, setUser } = useUser()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (!user || !(user as any).requiresPasswordReset) return null

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match')
    }
    
    if (newPassword.length < 6) {
      return setError('Password must be at least 6 characters')
    }

    setIsLoading(true)
    try {
      const updatedUser = await updatePassword(newPassword)
      setUser(updatedUser)
    } catch (err: any) {
      setError(err.message || 'Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ padding: '40px', maxWidth: '400px', width: '100%', border: '1px solid #ff3366', boxShadow: '0 0 30px rgba(255, 51, 102, 0.2)' }}>
        <h2 style={{ color: '#ff3366', marginTop: 0, textAlign: 'center' }}>Security Update Required</h2>
        <p style={{ color: '#fff', opacity: 0.8, textAlign: 'center', marginBottom: '30px' }}>
          An administrator has requested that you reset your password before continuing.
        </p>

        {error && (
          <div style={{ background: 'rgba(255, 51, 102, 0.2)', border: '1px solid #ff3366', color: '#ff3366', padding: '10px', borderRadius: '4px', textAlign: 'center', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ color: '#fff' }}>New Password</label>
            <input 
              required 
              type="password" 
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={{ padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '1rem' }}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ color: '#fff' }}>Confirm New Password</label>
            <input 
              required 
              type="password" 
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={{ padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '1rem' }}
            />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary" style={{ padding: '12px', fontSize: '1.1rem', fontWeight: 'bold', marginTop: '10px', background: '#ff3366', borderColor: '#ff3366', color: '#fff' }}>
            {isLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
