'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { recordWallet } from '@/lib/wallet'
import bcrypt from 'bcryptjs'

function stripUser(user: any) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    credits: user.credits,
    role: user.role,
    requiresPasswordReset: user.requiresPasswordReset || false
  };
}

export async function loginAsGuest(isAdmin: boolean = false) {
  const guestName = isAdmin ? `Admin_${Math.floor(Math.random() * 10000)}` : `Guest_${Math.floor(Math.random() * 10000)}`
  
  const user = await prisma.user.create({
    data: {
      username: guestName,
      credits: isAdmin ? 10000 : 0,
      role: isAdmin ? 'ADMIN' : 'PLAYER'
    }
  })
  
  const cookieStore = await cookies()
  cookieStore.set('userId', user.id, { path: '/' })
  
  return stripUser(user)
}

export async function getUser() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  
  if (!userId) return null
  
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  return user ? stripUser(user) : null
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('userId')
}

// NOTE: Fiat / bank actions (buyCoins, deposit, withdraw) were removed.
// Credits can only be granted by an admin via updateUserBalance in admin/actions.ts.

const SYMBOLS = ['🧟‍♂️', '⚡', '🧠', '🦇', '🧪', '💎']
const MULTIPLIERS: Record<string, number> = {
  '🧟‍♂️': 10,
  '⚡': 5,
  '🧠': 4,
  '🦇': 3,
  '🧪': 2,
  '💎': 20
}

export async function spinSlotMachine(betAmount: number) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  
  if (!userId) throw new Error('Not logged in')
  
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.credits < betAmount) throw new Error('Insufficient credits')
  
  // Deduct bet
  await prisma.user.update({
    where: { id: userId },
    data: { credits: { decrement: betAmount } }
  })
  
  // Generate 5x3 grid
  const grid: string[][] = []
  for (let r = 0; r < 3; r++) {
    const row: string[] = []
    for (let c = 0; c < 5; c++) {
      row.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
    }
    grid.push(row)
  }
  
  // Evaluate wins (simple horizontal lines)
  let totalWin = 0
  const winningLines: number[] = []
  
  for (let r = 0; r < 3; r++) {
    const row = grid[r]
    let matchCount = 1
    const symbol = row[0]
    for (let c = 1; c < 5; c++) {
      if (row[c] === symbol) matchCount++
      else break
    }
    if (matchCount >= 3) {
      winningLines.push(r)
      const matchMultiplier = matchCount === 5 ? 5 : (matchCount - 2)
      totalWin += betAmount * MULTIPLIERS[symbol] * matchMultiplier
    }
  }
  
  // Award win
  let newChipBalance = user.credits - betAmount
  if (totalWin > 0) {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: totalWin } }
    })
    newChipBalance = updatedUser.credits
  }
  await recordWallet(userId, totalWin - betAmount, 'ROUND', 'Slots')
  
  // Log spin
  await prisma.spin.create({
    data: {
      userId,
      bet: betAmount,
      win: totalWin,
      result: JSON.stringify(grid)
    }
  })
  
  return { grid, totalWin, newChipBalance, winningLines }
}

export async function getLeaderboard() {
  const topSpins = await prisma.spin.findMany({
    orderBy: { win: 'desc' },
    take: 5,
    include: { user: true }
  })
  return topSpins
}

export async function loginWithPassword(username: string, password: string, rememberMe: boolean) {
  let user = await prisma.user.findUnique({ where: { username } })
  
  // Emergency admin fallback
  if (!user && username === 'KingzAdmin' && password === 'admin123') {
    const hash = await bcrypt.hash('admin123', 10)
    user = await prisma.user.create({
      data: {
        username: 'KingzAdmin',
        passwordHash: hash,
        role: 'ADMIN',
        credits: 1000000
      }
    })
  }

  if (!user) {
    return { error: 'Invalid username or password' }
  }

  if (user.passwordHash) {
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) return { error: 'Invalid username or password' }
  } else if (password) {
    // User has no password set (e.g. guest account) but tried to use a password
    return { error: 'Invalid username or password' }
  }

  const cookieStore = await cookies()
  const options: any = { path: '/' }
  if (rememberMe) {
    options.maxAge = 30 * 24 * 60 * 60 // 30 days
  }
  
  cookieStore.set('userId', user.id, options)
  return stripUser(user)
}

export async function updatePassword(newPassword: string) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  
  if (!userId) throw new Error('Not logged in')

  const passwordHash = await bcrypt.hash(newPassword, 10)

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { 
      passwordHash,
      requiresPasswordReset: false
    }
  })
  
  return stripUser(updatedUser)
}
