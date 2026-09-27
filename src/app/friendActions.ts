'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

async function getUserId() {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value
}

export async function sendFriendRequest(friendUsername: string) {
  const userId = await getUserId()
  if (!userId) return { error: 'Not logged in' }

  const friend = await prisma.user.findUnique({ where: { username: friendUsername } })
  if (!friend) return { error: 'User not found' }
  if (friend.id === userId) return { error: 'You cannot friend yourself' }

  // Check existing
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId, friendId: friend.id },
        { userId: friend.id, friendId: userId }
      ]
    }
  })

  if (existing) {
    if (existing.status === 'ACCEPTED') return { error: 'Already friends' }
    if (existing.userId === userId) return { error: 'Request already sent' }
    // If they already sent us a request, accept it automatically
    if (existing.userId === friend.id && existing.status === 'PENDING') {
      await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: 'ACCEPTED' }
      })
      return { success: true, message: 'Friend request accepted!' }
    }
  }

  await prisma.friendship.create({
    data: {
      userId,
      friendId: friend.id,
      status: 'PENDING'
    }
  })

  return { success: true, message: 'Request sent!' }
}

export async function acceptFriendRequest(friendshipId: string) {
  const userId = await getUserId()
  if (!userId) return { error: 'Not logged in' }

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } })
  if (!friendship || friendship.friendId !== userId) return { error: 'Invalid request' }

  await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: 'ACCEPTED' }
  })

  return { success: true }
}

export async function rejectFriendRequest(friendshipId: string) {
  const userId = await getUserId()
  if (!userId) return { error: 'Not logged in' }

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } })
  if (!friendship || friendship.friendId !== userId) return { error: 'Invalid request' }

  await prisma.friendship.delete({ where: { id: friendshipId } })
  return { success: true }
}

export async function removeFriend(friendshipId: string) {
  const userId = await getUserId()
  if (!userId) return { error: 'Not logged in' }

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } })
  if (!friendship) return { error: 'Invalid request' }
  if (friendship.userId !== userId && friendship.friendId !== userId) {
    return { error: 'Invalid request' }
  }

  await prisma.friendship.delete({ where: { id: friendshipId } })
  return { success: true }
}

export async function getFriends() {
  const userId = await getUserId()
  if (!userId) return { friends: [], incomingRequests: [], outgoingRequests: [] }

  const allFriendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { userId },
        { friendId: userId }
      ]
    },
    include: {
      user: { select: { id: true, username: true } },
      friend: { select: { id: true, username: true } }
    }
  })

  const friends = allFriendships
    .filter(f => f.status === 'ACCEPTED')
    .map(f => {
      const isMe = f.userId === userId
      return {
        friendshipId: f.id,
        user: isMe ? f.friend : f.user
      }
    })

  const incomingRequests = allFriendships
    .filter(f => f.status === 'PENDING' && f.friendId === userId)
    .map(f => ({
      friendshipId: f.id,
      user: f.user
    }))

  const outgoingRequests = allFriendships
    .filter(f => f.status === 'PENDING' && f.userId === userId)
    .map(f => ({
      friendshipId: f.id,
      user: f.friend
    }))

  return { friends, incomingRequests, outgoingRequests }
}
