'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { logout as logoutAction, getUser } from '@/app/actions'
import { connectSocket } from '@/lib/socket'

type User = {
  id: string;
  username: string;
  credits: number;
  role: string;
}

type UserContextType = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => Promise<void>;
  updateCredits: (credits: number) => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children, initialUser }: { children: React.ReactNode, initialUser: User | null }) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [isLoading, setIsLoading] = useState(false)

  const logout = async () => {
    setIsLoading(true)
    await logoutAction()
    setUser(null)
    window.location.href = '/login'
  }
  
  const updateCredits = (credits: number) => {
    setUser(prev => prev ? { ...prev, credits } : null)
  }

  // Live balance: server pushes 'credits_updated' (admin edits, table payouts...).
  // Fallback: re-sync when the tab regains focus and every 15s, in case the socket drops.
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    const socket = connectSocket()
    const auth = () => socket.emit('authenticate', { userId, username: user?.username })
    socket.on('connect', auth)
    socket.on('credits_updated', (d: { credits: number }) => {
      if (typeof d?.credits === 'number') updateCredits(d.credits)
    })

    const resync = () => {
      if (document.visibilityState !== 'visible') return
      // Slot pages update the balance themselves after the reels stop
      if (/^\/games\/(frankenstein|piggies|buffalo)/.test(window.location.pathname)) return
      getUser().then(u => { if (u) updateCredits(u.credits) }).catch(() => {})
    }
    const interval = setInterval(resync, 15000)
    window.addEventListener('focus', resync)
    document.addEventListener('visibilitychange', resync)

    return () => {
      socket.disconnect()
      clearInterval(interval)
      window.removeEventListener('focus', resync)
      document.removeEventListener('visibilitychange', resync)
    }
  }, [userId])

  return (
    <UserContext.Provider value={{ user, setUser, logout, updateCredits, isLoading }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
