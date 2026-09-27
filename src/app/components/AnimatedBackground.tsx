'use client'

import React, { useEffect, useState } from 'react'

export default function AnimatedBackground() {
  const [stars, setStars] = useState<{ id: number, x: number, y: number, size: number, duration: number, delay: number, opacity: number }[]>([])

  useEffect(() => {
    // Generate static stars once on client mount
    const generatedStars = Array.from({ length: 75 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 60 + 60, // 60s to 120s slow drift
      delay: Math.random() * -100, // Negative delay so they are already moving
      opacity: Math.random() * 0.5 + 0.1 // Subtle opacity
    }))
    setStars(generatedStars)
  }, [])

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        background: 'linear-gradient(to bottom, #050508 0%, #0a0a0c 100%)',
        overflow: 'hidden',
        pointerEvents: 'none'
      }}
    >
      <style>{`
        @keyframes driftUp {
          from { transform: translateY(100vh); }
          to { transform: translateY(-100vh); }
        }
      `}</style>
      
      {stars.map(star => (
        <div
          key={star.id}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            opacity: star.opacity,
            animation: `driftUp ${star.duration}s linear infinite`,
            animationDelay: `${star.delay}s`,
            boxShadow: `0 0 ${star.size * 2}px rgba(255, 255, 255, 0.3)`
          }}
        />
      ))}
      
      {/* Subtle overlay gradient to mask edges and create depth */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at center, transparent 0%, #050508 120%)',
      }} />
    </div>
  )
}
