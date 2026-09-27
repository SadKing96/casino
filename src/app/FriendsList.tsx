'use client'

import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useUser } from '@/context/UserContext'
import { getFriends, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend } from './friendActions'

export default function FriendsList() {
  const { user } = useUser()
  const [friendsData, setFriendsData] = useState<{friends: any[], incomingRequests: any[], outgoingRequests: any[]}>({ friends: [], incomingRequests: [], outgoingRequests: [] })
  const [onlineUsers, setOnlineUsers] = useState<any[]>([])
  const [addUsername, setAddUsername] = useState('')
  const [message, setMessage] = useState('')
  
  // Tab state: 'friends', 'requests'
  const [tab, setTab] = useState<'friends' | 'requests'>('friends')

  useEffect(() => {
    if (!user) return
    loadFriends()
    
    // Connect to Socket
    const socket: Socket = io('http://localhost:3001')
    
    socket.on('connect', () => {
      socket.emit('authenticate', { userId: user.id, username: user.username })
    })

    socket.on('presence_update', (users) => {
      setOnlineUsers(users)
    })

    return () => {
      socket.disconnect()
    }
  }, [user])

  const loadFriends = async () => {
    const data = await getFriends()
    setFriendsData(data)
  }

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addUsername.trim()) return
    const res = await sendFriendRequest(addUsername.trim())
    if (res.error) setMessage(res.error)
    else {
      setMessage(res.message || 'Request sent!')
      setAddUsername('')
      loadFriends()
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const handleAccept = async (id: string) => {
    await acceptFriendRequest(id)
    loadFriends()
  }

  const handleReject = async (id: string) => {
    await rejectFriendRequest(id)
    loadFriends()
  }

  const handleRemove = async (id: string) => {
    await removeFriend(id)
    loadFriends()
  }

  if (!user) return null

  // Process friends to add online status
  const friendsWithStatus = friendsData.friends.map(f => {
    const onlineUser = onlineUsers.find(u => u.userId === f.user.id)
    return {
      ...f,
      isOnline: !!onlineUser,
      location: onlineUser?.location || 'offline'
    }
  })

  // Sort: online first
  friendsWithStatus.sort((a, b) => (a.isOnline === b.isOnline ? 0 : a.isOnline ? -1 : 1))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          className={`btn-secondary ${tab === 'friends' ? 'active' : ''}`}
          style={{ flex: 1, padding: '8px', background: tab === 'friends' ? 'rgba(0,229,255,0.1)' : 'transparent', borderColor: tab === 'friends' ? 'var(--neon-blue)' : 'var(--surface-border)' }}
          onClick={() => setTab('friends')}
        >
          Friends ({friendsData.friends.length})
        </button>
        <button 
          className={`btn-secondary ${tab === 'requests' ? 'active' : ''}`}
          style={{ flex: 1, padding: '8px', background: tab === 'requests' ? 'rgba(255,0,102,0.1)' : 'transparent', borderColor: tab === 'requests' ? 'var(--neon-pink)' : 'var(--surface-border)', position: 'relative' }}
          onClick={() => setTab('requests')}
        >
          Requests
          {friendsData.incomingRequests.length > 0 && (
            <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--neon-pink)', color: '#fff', borderRadius: '50%', width: 20, height: 20, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {friendsData.incomingRequests.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'friends' ? (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {friendsWithStatus.length === 0 ? (
            <p style={{ opacity: 0.5, textAlign: 'center', marginTop: '20px' }}>No friends yet.</p>
          ) : (
            friendsWithStatus.map(f => (
              <div key={f.friendshipId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: f.isOnline ? '#00ffcc' : '#555' }} />
                    <span style={{ fontWeight: 'bold' }}>{f.user.username}</span>
                  </div>
                  {f.isOnline && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--neon-blue)', marginTop: '4px', marginLeft: '18px' }}>
                      Playing {f.location === 'lobby' ? 'in Lobby' : f.location.replace('_', ' ')}
                    </div>
                  )}
                </div>
                <button onClick={() => handleRemove(f.friendshipId)} style={{ background: 'transparent', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer', fontSize: '0.8rem' }}>Remove</button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <form onSubmit={handleAddFriend} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Username to add..." 
              value={addUsername} 
              onChange={e => setAddUsername(e.target.value)}
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.5)', color: '#fff' }}
            />
            <button type="submit" className="btn-primary" style={{ padding: '8px 16px' }}>Send</button>
          </form>
          {message && <p style={{ color: 'var(--neon-gold)', fontSize: '0.9rem', textAlign: 'center' }}>{message}</p>}

          <div>
            <h4 style={{ opacity: 0.7, marginBottom: '8px' }}>Incoming ({friendsData.incomingRequests.length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {friendsData.incomingRequests.map(req => (
                <div key={req.friendshipId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                  <span>{req.user.username}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleAccept(req.friendshipId)} style={{ background: 'var(--neon-blue)', color: '#000', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>✓</button>
                    <button onClick={() => handleReject(req.friendshipId)} style={{ background: 'var(--neon-pink)', color: '#000', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
              ))}
              {friendsData.incomingRequests.length === 0 && <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>None</p>}
            </div>
          </div>

          <div>
            <h4 style={{ opacity: 0.7, marginBottom: '8px' }}>Outgoing ({friendsData.outgoingRequests.length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {friendsData.outgoingRequests.map(req => (
                <div key={req.friendshipId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                  <span>{req.user.username}</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Pending</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
