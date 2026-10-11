'use client'

import React, { createContext, useContext, useState } from 'react'
import { logout as logoutAction } from '@/app/actions'

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
    setIsLoading(false)
  }
  
  const updateCredits = (credits: number) => {
    setUser(prev => prev ? { ...prev, credits } : null)
  }

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
