'use client'

import React, { createContext, useContext, useState } from 'react'
import { logout as logoutAction } from '@/app/actions'

type User = {
  id: string;
  username: string;
  chipBalance: number;
  bankBalance: number;
  role: string;
}

type UserContextType = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => Promise<void>;
  updateBalances: (chipBalance: number, bankBalance: number) => void;
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
  
  const updateBalances = (chipBalance: number, bankBalance: number) => {
    setUser(prev => prev ? { ...prev, chipBalance, bankBalance } : null)
  }

  return (
    <UserContext.Provider value={{ user, setUser, logout, updateBalances, isLoading }}>
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
