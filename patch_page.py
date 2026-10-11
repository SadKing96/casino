import re

with open('src/app/games/frankenstein/page.tsx', 'r') as f:
    code = f.read()

# Add persistentMultipliers state
code = code.replace('const [gameState, setGameState] = useState<any>(null)',
'''const [gameState, setGameState] = useState<any>(null)
  const [persistentMultipliers, setPersistentMultipliers] = useState<number[]>(Array(15).fill(1))''')

code = code.replace(
'''    getFrankensteinState()
      .then(state => { if (mounted) setGameState(state) })''',
'''    getFrankensteinState()
      .then(res => { 
        if (mounted && res) {
          setGameState(res.state)
          if (res.persistentMultipliers) setPersistentMultipliers(res.persistentMultipliers)
        } 
      })'''
)

code = code.replace('const handleSpin = async (forceOptions?: { forceJackpot?: string, forceFreeSpins?: boolean }) => {',
'''const handleSpin = async (forceOptions?: { forceJackpot?: string, forceFreeSpins?: boolean }) => {
    setWinAmount(0)
    setLineWins([])
    setCollectedPrizes([])''')

code = code.replace('const [jackpotWon, setJackpotWon] = useState<string | null>(null)',
'''const [jackpotWon, setJackpotWon] = useState<string | null>(null)
  const [collectedPrizes, setCollectedPrizes] = useState<any[]>([])''')

code = code.replace('setJackpotWon(res.jackpotWon)', 
'''setJackpotWon(res.jackpotWon)
        if (res.persistentMultipliers) setPersistentMultipliers(res.persistentMultipliers)
        if (res.collectedPrizes) setCollectedPrizes(res.collectedPrizes)''')


# The UI Replacement
ui_target = '''<div className="flex-1 flex flex-col justify-between p-4">'''
ui_replacement = '''<div className="flex-1 flex flex-col justify-between p-4 z-10 relative">
          
          {/* Top Info Bar */}
          <div className="flex justify-between items-start mb-2">
            <div className="bg-cyan-900/40 border border-cyan-500/50 p-2 rounded text-xs text-cyan-200">
              <div className="text-[10px] text-cyan-400 uppercase tracking-wider mb-1">Active Players</div>
              <div className="flex flex-col gap-1">
                {activePlayers.map((p, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    {p}
                  </div>
                ))}
                {activePlayers.length === 0 && <div className="text-cyan-500/50 italic">No one else is here...</div>}
              </div>
            </div>

            {winAmount > 0 && (
              <div className="bg-blue-900/80 border border-blue-400 p-3 rounded text-center animate-pulse shadow-[0_0_20px_rgba(96,165,250,0.5)]">
                <div className="text-sm text-blue-300 uppercase tracking-wider font-bold">Winner!</div>
                <div className="text-2xl text-white font-bold">+${Math.floor(winAmount)}</div>
              </div>
            )}
            
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 bg-black/40 p-2 rounded-full border border-white/10">
                <span className="text-xl">🔈</span>
                <input 
                  type="range" 
                  min="0" max="1" step="0.05" 
                  value={volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    setVolume(v)
                    volumeRef.current = v
                    if (v === 0) setIsMuted(true)
                    else {
                      setIsMuted(false)
                      isMutedRef.current = false
                    }
                  }}
                  className="w-24 accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Pyramids Area */}
          <div className="flex flex-col items-center justify-center gap-4 mb-4">
            
            {/* Jackpots Pyramid */}
            <div className="flex flex-col items-center gap-1">
              {/* Row 1: GRAND */}
              <div className="flex gap-1">
                <div className="relative bg-gradient-to-b from-orange-500 to-amber-700 border-2 border-amber-300 w-48 h-12 rounded-lg flex flex-col items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                  <div className="text-xs font-black text-amber-100 uppercase tracking-widest">Grand</div>
                  <div className="text-lg font-bold text-white">${Math.floor(jackpots.grand).toLocaleString()}</div>
                  {persistentMultipliers[0] > 1 && <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-yellow-200">{persistentMultipliers[0]}x</div>}
                </div>
              </div>
              {/* Row 2: SUPER, MAJOR */}
              <div className="flex gap-1">
                {['super', 'major'].map((tier, idx) => {
                  const mIdx = idx + 1
                  return (
                    <div key={tier} className="relative bg-gradient-to-b from-orange-600 to-amber-800 border-2 border-amber-500/50 w-36 h-10 rounded-lg flex flex-col items-center justify-center shadow-lg">
                      <div className="text-[10px] font-bold text-amber-200 uppercase tracking-wider">{tier}</div>
                      <div className="text-sm font-bold text-white">${Math.floor(jackpots[tier as keyof typeof jackpots]).toLocaleString()}</div>
                      {persistentMultipliers[mIdx] > 1 && <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-yellow-200">{persistentMultipliers[mIdx]}x</div>}
                    </div>
                  )
                })}
              </div>
              {/* Row 3: MAXI, MINOR, MINI */}
              <div className="flex gap-1">
                {['maxi', 'minor', 'mini'].map((tier, idx) => {
                  const mIdx = idx + 3
                  return (
                    <div key={tier} className="relative bg-gradient-to-b from-orange-700 to-amber-900 border border-amber-600/50 w-28 h-10 rounded-lg flex flex-col items-center justify-center">
                      <div className="text-[9px] font-bold text-amber-300/80 uppercase">{tier}</div>
                      <div className="text-xs font-bold text-white/90">${Math.floor(jackpots[tier as keyof typeof jackpots]).toLocaleString()}</div>
                      {persistentMultipliers[mIdx] > 1 && <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-yellow-200">{persistentMultipliers[mIdx]}x</div>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Static Prizes Pyramid (Upside Down) */}
            <div className="flex flex-col items-center gap-1 opacity-90">
              {/* Row 1 */}
              <div className="flex gap-1">
                {[1000, 500, 300].map((val, idx) => {
                  const mIdx = 6 + idx
                  return (
                  <div key={val} className="relative bg-blue-900/80 border border-blue-400 w-24 h-8 flex items-center justify-center rounded">
                    <span className="text-sm font-bold text-blue-100">{val}</span>
                    {persistentMultipliers[mIdx] > 1 && <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-yellow-200">{persistentMultipliers[mIdx]}x</div>}
                  </div>
                )})}
              </div>
              {/* Row 2 */}
              <div className="flex gap-1">
                {[200, 150, 120].map((val, idx) => {
                  const mIdx = 9 + idx
                  return (
                  <div key={val} className="relative bg-blue-900/60 border border-blue-500/50 w-20 h-7 flex items-center justify-center rounded">
                    <span className="text-xs font-bold text-blue-200">{val}</span>
                    {persistentMultipliers[mIdx] > 1 && <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-yellow-200">{persistentMultipliers[mIdx]}x</div>}
                  </div>
                )})}
              </div>
              {/* Row 3 */}
              <div className="flex gap-1">
                {[100, 80, 60].map((val, idx) => {
                  const mIdx = 12 + idx
                  return (
                  <div key={val} className="relative bg-blue-950/60 border border-blue-600/40 w-16 h-6 flex items-center justify-center rounded">
                    <span className="text-[10px] font-bold text-blue-300">{val}</span>
                    {persistentMultipliers[mIdx] > 1 && <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-yellow-200">{persistentMultipliers[mIdx]}x</div>}
                  </div>
                )})}
              </div>
            </div>

          </div>

          {/* Slot Grid */}
          <div className="relative mx-auto bg-black/80 p-2 rounded-xl border border-white/10 shadow-2xl backdrop-blur-sm">
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map(c => (
                <div key={c} className="flex flex-col gap-2">
                  {[0, 1, 2].map(r => {
                    const symbol = grid[r]?.[c]
                    const isWinning = lineWins.some(line => {
                      const payline = PAYLINES[line]
                      return payline[c] === r
                    })
                    const isCollected = collectedPrizes.some(p => p.c === c && p.prizeName === symbol) || 
                                        collectedPrizes.some(p => p.c === c && p.jackpotName && symbol === 'ORANGE')

                    let glow = ''
                    if (symbol === '⚡' || symbol === '☄️' || symbol === '✖️' || symbol === '🔥') glow = 'animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                    if (isWinning) glow = 'shadow-[0_0_20px_rgba(250,204,21,0.8)] border-yellow-400'
                    if (isCollected) glow = 'shadow-[0_0_20px_rgba(56,189,248,0.8)] border-sky-400'

                    let renderedSymbol = symbol
                    if (symbol === 'POWER') renderedSymbol = '⚡'
                    else if (symbol === 'ALIVE') renderedSymbol = '🧪'
                    else if (symbol === 'BLUE') renderedSymbol = '🥶'
                    else if (symbol === 'ORANGE') renderedSymbol = '🎃'

                    return (
                      <div 
                        key={r} 
                        className={`w-20 h-20 bg-gradient-to-b from-gray-800 to-gray-900 rounded border border-gray-700 flex items-center justify-center text-4xl
                          ${isSpinning ? 'animate-[spin_0.1s_linear_infinite]' : ''}
                          ${glow}
                        `}
                      >
                        {!isSpinning && renderedSymbol}
                        {isCollected && <div className="absolute inset-0 bg-blue-400/30 rounded animate-pulse" />}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            
            {isFreeSpinMode && !isSpinning && (
              <div className="absolute -top-4 -right-4 bg-purple-600 text-white font-bold px-3 py-1 rounded-full border-2 border-white shadow-[0_0_15px_rgba(168,85,247,0.8)] animate-bounce">
                {gameState?.freeSpinsRemaining || 0} SPINS LEFT
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Bet Controls */}
        <div className="w-72 border-l border-white/10 bg-black/60 p-6 flex flex-col z-10 backdrop-blur-md relative">
          
          <div className="mb-10 text-center">
            <div className="text-gray-400 text-xs font-bold tracking-[0.2em] mb-1">CREDIT</div>
            <div className="text-3xl font-mono text-white">${Math.floor(user.credits).toLocaleString()}</div>
          </div>

          <div className="flex-1">
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[10, 50, 100, 200, 500, 1000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setBetAmount(amt)}
                  className={`py-4 rounded-lg font-bold text-sm tracking-wider border transition-all
                    ${betAmount === amt 
                      ? 'bg-cyan-900/30 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]' 
                      : 'bg-gray-900/50 border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                    }`}
                >
                  BET {amt}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto flex justify-center">
            <button
              onClick={() => handleSpin()}
              disabled={isSpinning || (!isFreeSpinMode && user.credits < betAmount)}
              className={`w-40 h-40 rounded-full flex flex-col items-center justify-center font-black text-3xl tracking-widest transition-all
                ${isFreeSpinMode 
                  ? 'bg-blue-600 text-white shadow-[0_0_30px_rgba(37,99,235,0.8)]' 
                  : 'bg-gray-800 text-gray-400 border-[8px] border-gray-700 hover:bg-gray-700 hover:text-white hover:border-cyan-700'
                }
                ${isSpinning ? 'opacity-50 scale-95' : 'hover:scale-105'}
                disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed
              `}
              style={{
                clipPath: isFreeSpinMode ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' : 'none',
                borderRadius: isFreeSpinMode ? '0' : '50%'
              }}
            >
              {isFreeSpinMode ? 'FREE' : 'SPIN'}
            </button>
          </div>
          
        </div>'''

start_idx = code.find('<div className="flex-1 flex flex-col justify-between p-4">')
end_idx = code.find('</div>\n      </div>\n    </div>\n  )')
if start_idx != -1 and end_idx != -1:
    code = code[:start_idx] + ui_replacement + code[end_idx:]

with open('src/app/games/frankenstein/page.tsx', 'w') as f:
    f.write(code)

print("Patched page.tsx successfully")
