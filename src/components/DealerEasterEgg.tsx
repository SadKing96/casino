'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const CONVERSATIONS = [
  [
    { speaker: 'Rusty', text: "Can you believe this guy? Been staring at the screen for 5 minutes without making a move.", img: '/images/dealer_rusty.png' },
    { speaker: 'Marty', text: "Cut 'em some slack, Rusty. Probably trying to figure out if a flush beats a straight.", img: '/images/dealer_marty.png' },
    { speaker: 'Rusty', text: "Hah! I bet they're just googling 'how to count cards' and getting nowhere.", img: '/images/dealer_rusty.png' },
    { speaker: 'Marty', text: "At least they're not asking for another comped drink.", img: '/images/dealer_marty.png' }
  ],
  [
    { speaker: 'Marty', text: "Hey Rusty, did you see the tip from the last guy at the Blackjack table?", img: '/images/dealer_marty.png' },
    { speaker: 'Rusty', text: "Yeah, a whole three bucks. I'm retiring to the Bahamas tomorrow.", img: '/images/dealer_rusty.png' },
    { speaker: 'Marty', text: "Hey, it's better than getting splashed with a watered-down mojito.", img: '/images/dealer_marty.png' },
    { speaker: 'Rusty', text: "Barely. Anyway, wake me up when this one finally clicks a button.", img: '/images/dealer_rusty.png' }
  ],
  [
    { speaker: 'Rusty', text: "My feet are killing me. When does the shift end?", img: '/images/dealer_rusty.png' },
    { speaker: 'Marty', text: "We're AI, Rusty. We don't have feet. Or shifts. We live in the cloud.", img: '/images/dealer_marty.png' },
    { speaker: 'Rusty', text: "Don't get philosophical with me, Marty. My virtual arches are aching.", img: '/images/dealer_rusty.png' },
    { speaker: 'Marty', text: "Just keep smiling. Or scowling, in your case.", img: '/images/dealer_marty.png' }
  ]
]

export function DealerEasterEgg() {
  const [showEgg, setShowEgg] = useState(false)
  const [activeConvo, setActiveConvo] = useState(-1)
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const resetTimer = () => {
      clearTimeout(timeoutId)
      if (showEgg) {
        setShowEgg(false)
      }
      // 5 minutes = 300000ms
      timeoutId = setTimeout(() => {
        setActiveConvo(Math.floor(Math.random() * CONVERSATIONS.length))
        setMsgIndex(0)
        setShowEgg(true)
      }, 300000)
    }

    // Attach event listeners for activity
    window.addEventListener('mousemove', resetTimer)
    window.addEventListener('keydown', resetTimer)
    window.addEventListener('click', resetTimer)
    window.addEventListener('scroll', resetTimer)

    resetTimer()

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('mousemove', resetTimer)
      window.removeEventListener('keydown', resetTimer)
      window.removeEventListener('click', resetTimer)
      window.removeEventListener('scroll', resetTimer)
    }
  }, [showEgg])

  useEffect(() => {
    if (!showEgg || activeConvo === -1) return
    
    const convoLength = CONVERSATIONS[activeConvo].length
    if (msgIndex < convoLength) {
      const timer = setTimeout(() => {
        setMsgIndex(prev => prev + 1)
      }, 3500) // 3.5 seconds per message
      return () => clearTimeout(timer)
    } else {
      // Hide after last message is read
      const hideTimer = setTimeout(() => {
        setShowEgg(false)
      }, 4000)
      return () => clearTimeout(hideTimer)
    }
  }, [showEgg, activeConvo, msgIndex])

  if (!showEgg || activeConvo === -1) return null

  const currentMessages = CONVERSATIONS[activeConvo].slice(0, msgIndex + 1)

  return (
    <AnimatePresence>
      {showEgg && (
        <motion.div 
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0 }}
          style={{
            position: 'fixed', bottom: '40px', right: '40px',
            width: '400px', background: 'rgba(0,0,0,0.9)',
            border: '2px solid #d4af37', borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.9)', zIndex: 9999,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div style={{ background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, transparent 100%)', padding: '12px', borderBottom: '1px solid rgba(212,175,55,0.3)', color: '#d4af37', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>BREAKROOM CHATTER</span>
            <button onClick={() => setShowEgg(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
          </div>
          
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '300px', overflowY: 'auto' }}>
            {currentMessages.map((msg, i) => (
              <motion.div 
                key={i} initial={{ opacity: 0, x: msg.speaker === 'Rusty' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexDirection: msg.speaker === 'Rusty' ? 'row' : 'row-reverse' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundImage: `url(${msg.img})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '2px solid #d4af37' }} />
                <div style={{ background: msg.speaker === 'Rusty' ? 'rgba(255,255,255,0.1)' : 'rgba(212,175,55,0.1)', border: `1px solid ${msg.speaker === 'Rusty' ? 'rgba(255,255,255,0.2)' : 'rgba(212,175,55,0.3)'}`, padding: '10px 14px', borderRadius: '12px', color: '#fff', fontSize: '0.9rem', maxWidth: '75%' }}>
                  <div style={{ color: '#d4af37', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '4px', textAlign: msg.speaker === 'Rusty' ? 'left' : 'right' }}>{msg.speaker}</div>
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
