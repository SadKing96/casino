--- MULTI REPLACE ---
TARGET:
export default function FrankensteinSlot() {
  const { user, updateBalance } = useUser()
REPLACEMENT:
export default function FrankensteinSlot() {
  const { user, updateBalances } = useUser()
TARGET:
  const handleSpin = async () => {
    if (!user || user.balance < betAmount) return
REPLACEMENT:
  const handleSpin = async () => {
    if (!user || user.chipBalance < betAmount) return
TARGET:
        setGrid(result.grid)
        updateBalance(result.newBalance)
REPLACEMENT:
        setGrid(result.grid)
        updateBalances(result.newChipBalance, user.bankBalance)
TARGET:
              border: '2px solid #ff6688',
              cursor: (user.balance < betAmount || isSpinning) ? 'not-allowed' : 'pointer',
              opacity: (user.balance < betAmount || isSpinning) ? 0.5 : 1
            }}
            onClick={handleSpin}
            disabled={isSpinning || user.balance < betAmount}
          >
REPLACEMENT:
              border: '2px solid #ff6688',
              cursor: (user.chipBalance < betAmount || isSpinning) ? 'not-allowed' : 'pointer',
              opacity: (user.chipBalance < betAmount || isSpinning) ? 0.5 : 1
            }}
            onClick={handleSpin}
            disabled={isSpinning || user.chipBalance < betAmount}
          >
--------------

--- MULTI REPLACE ---
--------------

--- REPLACE ---
TARGET:
"  return (\n  return (\n    <div style={{ \n      display: 'flex', \n      flexDirection: 'column',"
REPLACEMENT:
"  return (\n    <div style={{ \n      display: 'flex', \n      flexDirection: 'column',"
--------------

--- REPLACE ---
TARGET:
"    <div style={{ \n      display: 'flex', \n      flexDirection: 'column', \n      alignItems: 'center',\n      paddingTop: '20px'\n    }}>"
REPLACEMENT:
"    <div style={{ \n      display: 'flex', \n      flexDirection: 'column', \n      alignItems: 'center',\n      justifyContent: 'space-evenly',\n      height: 'calc(100vh - 100px)',\n      paddingBottom: '20px'\n    }}>"
--------------

--- REPLACE ---
TARGET:
"      {/* JACKPOT DISPLAY (TOP) */}\n      <div style={{\n        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', \n        marginBottom: '10px', maxWidth: '800px', padding: '10px',\n        background: 'rgba(0,0,0,0.7)', borderRadius: '12px', border: '2px solid rgba(255,100,0,0.5)'\n      }}>\n        {JACKPOT_NAMES.map(name => {\n           const val = betAmount * JACKPOT_MULT[name]\n           const isGrand = name === 'GRAND'\n           return (\n             <div key={name} style={{\n               padding: '4px 12px', textAlign: 'center',\n               color: isGrand ? '#fff' : 'var(--neon-gold)',\n               textShadow: isGrand ? '0 0 10px #ff0000, 0 0 20px #ffaa00' : 'none',\n               fontSize: isGrand ? '1.5rem' : '1rem',\n               fontWeight: 'bold',\n               animation: jackpotWon === name ? 'pulse 0.5s infinite alternate' : 'none'\n             }}>\n               <div style={{ fontSize: '0.6em', opacity: 0.8 }}>{name}</div>\n               <div>${val.toLocaleString()}</div>\n             </div>\n           )\n        })}\n      </div>\n\n      {/* MULTIPLIER / FREE SPINS STATUS */}\n      {isFreeSpins && (\n        <motion.div \n          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}\n          style={{\n            background: 'linear-gradient(90deg, #aa0000, #ff5500)',\n            padding: '10px 40px', borderRadius: '30px', border: '3px solid #ffaa00',\n            color: '#fff', fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '10px',\n            boxShadow: '0 0 20px #ff5500'\n          }}\n        >\n          FREE SPINS: {gameState.freeSpinsRemaining} | MULTIPLIER: {gameState.currentMultiplier}X\n        </motion.div>\n      )}\n\n      {/* PYRAMID NUMBERS DISPLAY */}\n      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginBottom: '20px' }}>\n        <div style={{ display: 'flex', gap: '8px' }}>\n          {[1000, 500, 300].map(n => <div key={n} className=\"pyramid-block\">{n
<truncated 360 bytes>
REPLACEMENT:
"      {/* JACKPOT & PYRAMID DISPLAY */}\n      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginBottom: '20px', width: '600px' }}>\n        \n        {/* Row 1: GRAND */}\n        <div className=\"jackpot-block grand-block\" style={{ width: '100%', animation: jackpotWon === 'GRAND' ? 'pulse 0.5s infinite alternate' : 'none' }}>\n          <div className=\"jackpot-amount\">${(betAmount * JACKPOT_MULT['GRAND']).toLocaleString()}</div>\n          <div className=\"jackpot-label\">GRAND</div>\n        </div>\n\n        {/* Row 2: SUPER & MAJOR */}\n        <div style={{ display: 'flex', gap: '4px', width: '100%' }}>\n          <div className=\"jackpot-block\" style={{ flex: 1, animation: jackpotWon === 'SUPER' ? 'pulse 0.5s infinite alternate' : 'none' }}>\n            <div className=\"jackpot-amount\">${(betAmount * JACKPOT_MULT['SUPER']).toLocaleString()}</div>\n            <div className=\"jackpot-label\">SUPER</div>\n          </div>\n          <div className=\"jackpot-block\" style={{ flex: 1, animation: jackpotWon === 'MAJOR' ? 'pulse 0.5s infinite alternate' : 'none' }}>\n            <div className=\"jackpot-amount\">${(betAmount * JACKPOT_MULT['MAJOR']).toLocaleString()}</div>\n            <div className=\"jackpot-label\">MAJOR</div>\n          </div>\n        </div>\n\n        {/* Row 3: MAXI, MINOR, MINI */}\n        <div style={{ display: 'flex', gap: '4px', width: '100%' }}>\n          <div className=\"jackpot-block\" style={{ flex: 1, animation: jackpotWon === 'MAXI' ? 'pulse 0.5s infinite alternate' : 'none' }}>\n            <div className=\"jackpot-amount\">${(betAmount * JACKPOT_MULT['MAXI']).toLocaleString()}</div>\n            <div className=\"jackpot-label\">MAXI</div>\n          </div>\n          <div className=\"jackpot-block\" style={{ flex: 1, animation: jackpotWon === 'MINOR' ? 'pulse 0.5s infinite alternate' : 'none' }}>\n            <div className=\"jackpot-amount\">${(betAmount * JACKPOT_MULT['MINOR']).toLocaleString()}</div>\n            <div 
<truncated 957 bytes>
--------------

--- REPLACE ---
TARGET:
"      {/* 3D SLOT MACHINE CONTAINER */}\n      <div style={{ perspective: '1000px', marginBottom: '20px' }}>\n        <div style={{\n          transform: 'rotateX(5deg)',\n          background: 'rgba(0, 0, 20, 0.8)',\n          border: '4px solid #00aaff',\n          boxShadow: '0 0 40px #0055ff, inset 0 0 20px #00aaff',\n          borderRadius: '16px',\n          padding: '20px',\n          display: 'flex', flexDirection: 'column', gap: '10px',\n          width: '500px'\n        }}>\n          \n          <div style={{ height: '30px', textAlign: 'center', color: '#00aaff', fontWeight: 'bold', textShadow: '0 0 10px #00aaff' }}>\n             {lastWin !== null && lastWin > 0 && `WINNER! +$${lastWin.toLocaleString()}`}\n             {jackpotWon && ` | WON ${jackpotWon} JACKPOT!`}\n          </div>\n\n          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>\n            {grid.map((row, rIndex) => (\n              <div key={rIndex} style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>\n                {row.map((symbol, cIndex) => {\n                  const isWinning = winningLines.includes(rIndex)\n                  const isLightning = lightningSpreads.some(s => s.r === rIndex && s.c === cIndex)\n                  const isFire = fireSpreads.some(s => s.r === rIndex && s.c === cIndex)\n                  \n                  return (\n                    <div key={cIndex} style={{\n                      width: '80px', height: '80px', background: '#0a0a1a',\n                      borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',\n                      fontSize: '3.5rem', border: '1px solid #333',\n                      boxShadow: isLightning ? '0 0 20px #00ffff, inset 0 0 20px #00ffff' : (isFire ? '0 0 20px #ff5500, inset 0 0 20px #ff5500' : (isWinning ? 'inset 0 0 20px #00aaff' : 'inset 0 0 15px #000')),\n                      filter: isSpinning ? 'blur(5px) brightness(1.5)' : 'none',\n                      transition: 'all 0.2s',\n             
<truncated 3756 bytes>
REPLACEMENT:
"      {/* MULTIPLIER / FREE SPINS STATUS */}\n      <AnimatePresence>\n        {isFreeSpins && (\n          <motion.div \n            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}\n            style={{\n              background: 'linear-gradient(90deg, #aa0000, #ff5500)',\n              padding: '10px 40px', borderRadius: '30px', border: '3px solid #ffaa00',\n              color: '#fff', fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '10px',\n              boxShadow: '0 0 20px #ff5500', textShadow: '0 0 10px rgba(0,0,0,0.8)'\n            }}\n          >\n            FREE SPINS: {gameState.freeSpinsRemaining} | MULTIPLIER: {gameState.currentMultiplier}X\n          </motion.div>\n        )}\n      </AnimatePresence>\n\n      {/* 3D SLOT MACHINE CONTAINER */}\n      <div style={{ perspective: '1000px', marginBottom: '20px' }}>\n        <div style={{\n          transform: 'rotateX(5deg)',\n          background: 'rgba(0, 0, 20, 0.8)',\n          border: '4px solid #00aaff',\n          boxShadow: '0 0 40px #0055ff, inset 0 0 20px #00aaff',\n          borderRadius: '16px',\n          padding: '20px',\n          display: 'flex', flexDirection: 'column', gap: '10px',\n          width: '500px'\n        }}>\n          \n          <div style={{ height: '30px', textAlign: 'center', color: '#00aaff', fontWeight: 'bold', textShadow: '0 0 10px #00aaff' }}>\n             {lastWin !== null && lastWin > 0 && `WINNER! +$${lastWin.toLocaleString()}`}\n             {jackpotWon && ` | WON ${jackpotWon} JACKPOT!`}\n          </div>\n\n          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>\n            {grid.map((row, rIndex) => (\n              <div key={rIndex} style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>\n                {row.map((symbol, cIndex) => {\n                  const isWinning = winningLines.includes(rIndex)\n                  const isLightning = lightningSpreads.some(s => s.r === rIndex && s.c === cIndex)\n              
<truncated 6036 bytes>
--------------

--- REPLACE ---
TARGET:
"        .jackpot-block {\n          border: 3px solid #ffaa00;\n          background: linear-gradient(180deg, rgba(255,100,0,0.2) 0%, rgba(200,0,0,0.6) 100%);\n          box-shadow: inset 0 0 20px rgba(255,100,0,0.5), 0 0 10px rgba(255,50,0,0.8);\n          text-align: center;\n          padding: 8px 16px;\n          border-radius: 4px;\n          display: flex;\n          flex-direction: column;\n          align-items: center;\n          justify-content: center;\n          clip-path: polygon(5% 0, 95% 0, 100% 100%, 0% 100%);\n        }\n        .grand-block {\n          padding: 16px;\n          background: linear-gradient(180deg, rgba(255,200,0,0.3) 0%, rgba(255,50,0,0.8) 100%);\n          border-color: #ffcc00;\n          box-shadow: inset 0 0 30px rgba(255,200,0,0.6), 0 0 20px #ff5500;\n        }\n        .jackpot-amount {\n          color: #ffcc00;\n          font-weight: 900;\n          font-size: 2rem;\n          text-shadow: 0 0 10px #ff0000, 2px 2px 0px #000;\n          line-height: 1.1;\n        }\n        .grand-block .jackpot-amount {\n          font-size: 4.5rem;\n          text-shadow: 0 0 20px #ffaa00, 3px 3px 0px #000;\n        }\n        .jackpot-label {\n          color: #fff;\n          font-size: 0.9rem;\n          letter-spacing: 2px;\n          opacity: 0.9;\n          text-shadow: 1px 1px 2px #000;\n          margin-top: 4px;\n          font-family: 'Courier New', Courier, monospace;\n          font-weight: bold;\n        }\n        .pyramid-block {\n          border: 2px solid #00aaff;\n          color: #00aaff;\n          font-weight: bold;\n          padding: 4px 16px;\n          background: rgba(0, 40, 100, 0.6);\n          box-shadow: 0 0 10px #00aaff, inset 0 0 10px #0055ff;\n          text-shadow: 0 0 5px #00aaff;\n          clip-path: polygon(10% 0, 90% 0, 100% 100%, 0% 100%);\n        }"
REPLACEMENT:
"        .jackpot-block {\n          border: 3px solid #ffaa00;\n          background: linear-gradient(180deg, rgba(255,100,0,0.2) 0%, rgba(200,0,0,0.6) 100%);\n          box-shadow: inset 0 0 20px rgba(255,100,0,0.5), 0 0 10px rgba(255,50,0,0.8);\n          text-align: center;\n          padding: 6px 12px;\n          border-radius: 4px;\n          display: flex;\n          flex-direction: column;\n          align-items: center;\n          justify-content: center;\n          clip-path: polygon(5% 0, 95% 0, 100% 100%, 0% 100%);\n        }\n        .grand-block {\n          padding: 10px;\n          background: linear-gradient(180deg, rgba(255,200,0,0.3) 0%, rgba(255,50,0,0.8) 100%);\n          border-color: #ffcc00;\n          box-shadow: inset 0 0 30px rgba(255,200,0,0.6), 0 0 20px #ff5500;\n        }\n        .jackpot-amount {\n          color: #ffcc00;\n          font-weight: 900;\n          font-size: 1.6rem;\n          text-shadow: 0 0 10px #ff0000, 2px 2px 0px #000;\n          line-height: 1.1;\n        }\n        .grand-block .jackpot-amount {\n          font-size: 3.2rem;\n          text-shadow: 0 0 20px #ffaa00, 3px 3px 0px #000;\n        }\n        .jackpot-label {\n          color: #fff;\n          font-size: 0.8rem;\n          letter-spacing: 2px;\n          opacity: 0.9;\n          text-shadow: 1px 1px 2px #000;\n          margin-top: 2px;\n          font-family: 'Courier New', Courier, monospace;\n          font-weight: bold;\n        }\n        .pyramid-block {\n          border: 2px solid #00aaff;\n          color: #00aaff;\n          font-size: 1.4rem;\n          font-weight: bold;\n          padding: 6px 28px;\n          background: rgba(0, 40, 100, 0.6);\n          box-shadow: 0 0 10px #00aaff, inset 0 0 10px #0055ff;\n          text-shadow: 0 0 5px #00aaff;\n          clip-path: polygon(10% 0, 90% 0, 100% 100%, 0% 100%);\n        }"
--------------

--- REPLACE ---
TARGET:
"        .jackpot-block {\n          border: 3px solid #ffaa00;\n          background: linear-gradient(180deg, rgba(255,100,0,0.2) 0%, rgba(200,0,0,0.6) 100%);\n          box-shadow: inset 0 0 20px rgba(255,100,0,0.5), 0 0 10px rgba(255,50,0,0.8);\n          text-align: center;\n          padding: 6px 12px;\n          border-radius: 4px;\n          display: flex;\n          flex-direction: column;\n          align-items: center;\n          justify-content: center;\n          clip-path: polygon(5% 0, 95% 0, 100% 100%, 0% 100%);\n        }\n        .grand-block {\n          padding: 10px;\n          background: linear-gradient(180deg, rgba(255,200,0,0.3) 0%, rgba(255,50,0,0.8) 100%);\n          border-color: #ffcc00;\n          box-shadow: inset 0 0 30px rgba(255,200,0,0.6), 0 0 20px #ff5500;\n        }\n        .jackpot-amount {\n          color: #ffcc00;\n          font-weight: 900;\n          font-size: 1.6rem;\n          text-shadow: 0 0 10px #ff0000, 2px 2px 0px #000;\n          line-height: 1.1;\n        }\n        .grand-block .jackpot-amount {\n          font-size: 3.2rem;\n          text-shadow: 0 0 20px #ffaa00, 3px 3px 0px #000;\n        }\n        .jackpot-label {\n          color: #fff;\n          font-size: 0.8rem;\n          letter-spacing: 2px;\n          opacity: 0.9;\n          text-shadow: 1px 1px 2px #000;\n          margin-top: 2px;\n          font-family: 'Courier New', Courier, monospace;\n          font-weight: bold;\n        }\n        .pyramid-block {\n          border: 2px solid #00aaff;\n          color: #00aaff;\n          font-size: 1.4rem;\n          font-weight: bold;\n          padding: 6px 28px;\n          background: rgba(0, 40, 100, 0.6);\n          box-shadow: 0 0 10px #00aaff, inset 0 0 10px #0055ff;\n          text-shadow: 0 0 5px #00aaff;\n          clip-path: polygon(10% 0, 90% 0, 100% 100%, 0% 100%);\n        }"
REPLACEMENT:
"        .jackpot-block {\n          border: 3px solid #ffaa00;\n          background: linear-gradient(180deg, rgba(255,100,0,0.2) 0%, rgba(200,0,0,0.6) 100%);\n          box-shadow: inset 0 0 20px rgba(255,100,0,0.5), 0 0 10px rgba(255,50,0,0.8);\n          text-align: center;\n          padding: 4px 10px;\n          border-radius: 4px;\n          display: flex;\n          flex-direction: column;\n          align-items: center;\n          justify-content: center;\n          clip-path: polygon(5% 0, 95% 0, 100% 100%, 0% 100%);\n        }\n        .grand-block {\n          padding: 8px;\n          background: linear-gradient(180deg, rgba(255,200,0,0.3) 0%, rgba(255,50,0,0.8) 100%);\n          border-color: #ffcc00;\n          box-shadow: inset 0 0 30px rgba(255,200,0,0.6), 0 0 20px #ff5500;\n        }\n        .jackpot-amount {\n          color: #ffcc00;\n          font-weight: 900;\n          font-size: 1.4rem;\n          text-shadow: 0 0 10px #ff0000, 2px 2px 0px #000;\n          line-height: 1.1;\n        }\n        .grand-block .jackpot-amount {\n          font-size: 2.6rem;\n          text-shadow: 0 0 20px #ffaa00, 3px 3px 0px #000;\n        }\n        .jackpot-label {\n          color: #fff;\n          font-size: 0.8rem;\n          letter-spacing: 2px;\n          opacity: 0.9;\n          text-shadow: 1px 1px 2px #000;\n          margin-top: 2px;\n          font-family: 'Courier New', Courier, monospace;\n          font-weight: bold;\n        }\n        .pyramid-block {\n          border: 2px solid #00aaff;\n          color: #00aaff;\n          font-size: 1.6rem;\n          font-weight: bold;\n          padding: 8px 36px;\n          background: rgba(0, 40, 100, 0.6);\n          box-shadow: 0 0 10px #00aaff, inset 0 0 10px #0055ff;\n          text-shadow: 0 0 5px #00aaff;\n          clip-path: polygon(10% 0, 90% 0, 100% 100%, 0% 100%);\n        }"
--------------

--- MULTI REPLACE ---
--------------

--- MULTI REPLACE ---
--------------

--- MULTI REPLACE ---
--------------

--- MULTI REPLACE ---
TARGET:
      alignItems: 'center',
      justifyContent: 'space-evenly',
      height: 'calc(100vh - 100px)',
      paddingRight: '160px'
    }}>
REPLACEMENT:
      alignItems: 'center',
      justifyContent: 'space-evenly',
      height: 'calc(100vh - 100px)',
      paddingBottom: '20px'
    }}>
TARGET:
      {/* BUTTON DECK (Vertical on the right side) */}
      <div style={{ 
        position: 'fixed',
        top: 0, bottom: 0, right: 0,
        width: '160px',
        background: 'linear-gradient(90deg, #222 0%, #050505 100%)',
        borderLeft: '4px solid #00ffff',
        boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.8), inset 2px 0 10px rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '40px 0',
        zIndex: 100
      }}>
REPLACEMENT:
      {/* BUTTON DECK (Vertical floating on the right side) */}
      <div style={{ 
        position: 'fixed',
        right: '40px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(0,0,0,0.8)', padding: '24px', borderRadius: '24px',
        border: '1px solid rgba(0, 255, 255, 0.2)', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        backdropFilter: 'blur(10px)',
        zIndex: 100
      }}>
--------------

--- REPLACE ---
TARGET:
"      {/* BUTTON DECK (Vertical floating on the right side) */}\n      <div style={{ \n        position: 'fixed',\n        right: '40px',\n        top: '50%',\n        transform: 'translateY(-50%)',\n        background: 'rgba(0,0,0,0.8)', padding: '24px', borderRadius: '24px',\n        border: '1px solid rgba(0, 255, 255, 0.2)', \n        display: 'flex',\n        flexDirection: 'column',\n        alignItems: 'center',\n        gap: '24px',\n        backdropFilter: 'blur(10px)',\n        zIndex: 100\n      }}>\n        {/* TOP: Mini Display */}\n        <div style={{\n          background: '#000',\n          border: '2px solid #333',\n          borderRadius: '8px',\n          padding: '12px 8px',\n          display: 'flex',\n          flexDirection: 'column',\n          alignItems: 'center',\n          gap: '4px',\n          boxShadow: 'inset 0 0 20px rgba(0, 100, 255, 0.2)',\n          width: '90%'\n        }}>\n          <div style={{ color: '#00aaff', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>CREDIT</div>\n          <div style={{ color: '#fff', fontSize: '1.2rem', fontFamily: 'monospace', fontWeight: 'bold' }}>${user.chipBalance.toLocaleString()}</div>\n        </div>\n\n        {/* CENTER: Bet Buttons (OLED style) */}\n        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>\n          {[10, 50, 100, 200, 500].map((amount, idx) => {\n            const colors = ['#00ffff', '#ff00ff', '#00ff00', '#ffff00', '#ff5500']\n            const c = colors[idx]\n            const isSelected = betAmount === amount\n            return (\n              <button \n                key={amount}\n                style={{\n                  width: '100px', height: '100px',\n                  borderRadius: '16px',\n                  background: isSelected ? `linear-gradient(180deg, ${c}40 0%, ${c}10 100%)` : 'linear-gradient(180deg, #333 0%, #111 100%)',\n                  border: `3px solid ${isSelected ? c : '#444'}`,\n                  boxShadow: isSelect
<truncated 2867 bytes>
REPLACEMENT:
"      {/* BUTTON DECK (Vertical floating on the right side) */}\n      <div style={{ \n        position: 'fixed',\n        right: '40px',\n        top: '50%',\n        transform: 'translateY(-50%)',\n        background: 'rgba(0,0,0,0.8)', padding: '16px', borderRadius: '24px',\n        border: '1px solid rgba(0, 255, 255, 0.2)', \n        display: 'flex',\n        flexDirection: 'column',\n        alignItems: 'center',\n        gap: '16px',\n        backdropFilter: 'blur(10px)',\n        zIndex: 100\n      }}>\n        {/* TOP: Mini Display */}\n        <div style={{\n          background: '#000',\n          border: '2px solid #333',\n          borderRadius: '8px',\n          padding: '8px 12px',\n          display: 'flex',\n          flexDirection: 'column',\n          alignItems: 'center',\n          gap: '2px',\n          boxShadow: 'inset 0 0 20px rgba(0, 100, 255, 0.2)',\n          width: '100%'\n        }}>\n          <div style={{ color: '#00aaff', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>CREDIT</div>\n          <div style={{ color: '#fff', fontSize: '1.2rem', fontFamily: 'monospace', fontWeight: 'bold' }}>${user.chipBalance.toLocaleString()}</div>\n        </div>\n\n        {/* CENTER: Bet Buttons (2 columns) */}\n        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>\n          {[10, 50, 100, 200, 500].map((amount, idx) => {\n            const colors = ['#00ffff', '#ff00ff', '#00ff00', '#ffff00', '#ff5500']\n            const c = colors[idx]\n            const isSelected = betAmount === amount\n            return (\n              <button \n                key={amount}\n                style={{\n                  width: '70px', height: '70px',\n                  borderRadius: '12px',\n                  background: isSelected ? `linear-gradient(180deg, ${c}40 0%, ${c}10 100%)` : 'linear-gradient(180deg, #333 0%, #111 100%)',\n                  border: `2px solid ${isSelected ? c : '#444'}`,\n                  boxShadow: isSe
<truncated 2988 bytes>
--------------

--- REPLACE ---
TARGET:
"        {/* CENTER: Bet Buttons (2 columns) */}\n        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>\n          {[10, 50, 100, 200, 500].map((amount, idx) => {\n            const colors = ['#00ffff', '#ff00ff', '#00ff00', '#ffff00', '#ff5500']\n            const c = colors[idx]\n            const isSelected = betAmount === amount\n            return (\n              <button \n                key={amount}\n                style={{\n                  width: '70px', height: '70px',\n                  borderRadius: '12px',\n                  background: isSelected ? `linear-gradient(180deg, ${c}40 0%, ${c}10 100%)` : 'linear-gradient(180deg, #333 0%, #111 100%)',\n                  border: `2px solid ${isSelected ? c : '#444'}`,\n                  boxShadow: isSelected ? `0 0 15px ${c}80, inset 0 0 15px ${c}40` : '0 5px 10px rgba(0,0,0,0.5)',\n                  color: isSelected ? '#fff' : '#aaa',\n                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',\n                  cursor: (isSpinning || isFreeSpins) ? 'not-allowed' : 'pointer',\n                  opacity: (isSpinning || isFreeSpins) ? 0.5 : 1,\n                  transition: 'all 0.2s',\n                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',\n                  gridColumn: idx === 4 ? '1 / -1' : 'auto'\n                }}\n                onClick={() => setBetAmount(amount)}\n                disabled={isSpinning || isFreeSpins}\n              >\n                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: isSelected ? c : '#aaa', textShadow: isSelected ? `0 0 5px ${c}` : 'none' }}>BET</span>\n                <span style={{ fontSize: '1.4rem', fontWeight: '900', textShadow: isSelected ? '0 0 10px #fff' : 'none', lineHeight: '1.2' }}>{amount}</span>\n                <span style={{ fontSize: '0.5rem', fontWeight: 'bold', opacity: 0.8 }}>CREDITS</span>\n              </button>\n            )\n          })}\n        </div>"
REPLACEMENT:
"        {/* CENTER: Bet Buttons (3x2 grid) */}\n        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>\n          {[10, 50, 100, 200, 500, 1000].map((amount, idx) => {\n            const colors = ['#00ffff', '#ff00ff', '#00ff00', '#ffff00', '#ff5500', '#ff0055']\n            const c = colors[idx]\n            const isSelected = betAmount === amount\n            return (\n              <button \n                key={amount}\n                style={{\n                  width: '70px', height: '70px',\n                  borderRadius: '12px',\n                  background: isSelected ? `linear-gradient(180deg, ${c}40 0%, ${c}10 100%)` : 'linear-gradient(180deg, #333 0%, #111 100%)',\n                  border: `2px solid ${isSelected ? c : '#444'}`,\n                  boxShadow: isSelected ? `0 0 15px ${c}80, inset 0 0 15px ${c}40` : '0 5px 10px rgba(0,0,0,0.5)',\n                  color: isSelected ? '#fff' : '#aaa',\n                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',\n                  cursor: (isSpinning || isFreeSpins) ? 'not-allowed' : 'pointer',\n                  opacity: (isSpinning || isFreeSpins) ? 0.5 : 1,\n                  transition: 'all 0.2s',\n                  transform: isSelected ? 'scale(1.05)' : 'scale(1)'\n                }}\n                onClick={() => setBetAmount(amount)}\n                disabled={isSpinning || isFreeSpins}\n              >\n                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: isSelected ? c : '#aaa', textShadow: isSelected ? `0 0 5px ${c}` : 'none' }}>BET</span>\n                <span style={{ fontSize: amount >= 1000 ? '1.1rem' : '1.4rem', fontWeight: '900', textShadow: isSelected ? '0 0 10px #fff' : 'none', lineHeight: '1.2' }}>{amount}</span>\n                <span style={{ fontSize: '0.5rem', fontWeight: 'bold', opacity: 0.8 }}>CREDITS</span>\n              </button>\n            )\n          })}\n        </div>"
--------------

--- REPLACE ---
TARGET:
"  return (\n    <div style={{ "
REPLACEMENT:
"  return (\n    <div style={{ \n      display: 'flex', \n      flexDirection: 'column', \n      alignItems: 'center',\n      justifyContent: 'center',\n      height: 'calc(100vh - 100px)',\n      paddingBottom: '20px'\n    }}>\n      <Link \n        href=\"/?category=Slots\"\n        style={{\n          position: 'absolute', top: '20px', left: '20px', zIndex: 1000,\n          background: 'rgba(0,0,0,0.6)', border: '1px solid #fff', borderRadius: '8px',\n          padding: '8px 16px', color: '#fff', textDecoration: 'none', fontWeight: 'bold', backdropFilter: 'blur(5px)'\n        }}\n      >\n        ← Return to Lobby\n      </Link>"
--------------

--- REPLACE ---
TARGET:
"  return (\n    <div style={{ \n      display: 'flex', \n      flexDirection: 'column', \n      alignItems: 'center',\n      justifyContent: 'center',\n      height: 'calc(100vh - 100px)',\n      paddingBottom: '20px'\n    }}>\n      <Link \n        href=\"/?category=Slots\"\n        style={{\n          position: 'absolute', top: '20px', left: '20px', zIndex: 1000,\n          background: 'rgba(0,0,0,0.6)', border: '1px solid #fff', borderRadius: '8px',\n          padding: '8px 16px', color: '#fff', textDecoration: 'none', fontWeight: 'bold', backdropFilter: 'blur(5px)'\n        }}\n      >\n        ← Return to Lobby\n      </Link>\n      display: 'flex', \n      flexDirection: 'column', \n      alignItems: 'center',\n      justifyContent: 'space-evenly',\n      height: 'calc(100vh - 100px)',\n      paddingBottom: '20px'\n    }}>"
REPLACEMENT:
"  return (\n    <div style={{ \n      display: 'flex', \n      flexDirection: 'column', \n      alignItems: 'center',\n      justifyContent: 'space-evenly',\n      height: 'calc(100vh - 100px)',\n      paddingBottom: '20px'\n    }}>\n      <Link \n        href=\"/?category=Slots\"\n        style={{\n          position: 'absolute', top: '20px', left: '20px', zIndex: 1000,\n          background: 'rgba(0,0,0,0.6)', border: '1px solid #fff', borderRadius: '8px',\n          padding: '8px 16px', color: '#fff', textDecoration: 'none', fontWeight: 'bold', backdropFilter: 'blur(5px)'\n        }}\n      >\n        ← Return to Lobby\n      </Link>"
--------------

--- REPLACE ---
TARGET:
"  return (\n    <div style={{ \n      display: 'flex', \n      flexDirection: 'column', \n      alignItems: 'center',\n      justifyContent: 'space-evenly',\n      height: 'calc(100vh - 100px)',\n      paddingBottom: '20px'\n    }}>\n      <Link \n        href=\"/?category=Slots\"\n        style={{\n          position: 'absolute', top: '20px', left: '20px', zIndex: 1000,\n          background: 'rgba(0,0,0,0.6)', border: '1px solid #fff', borderRadius: '8px',\n          padding: '8px 16px', color: '#fff', textDecoration: 'none', fontWeight: 'bold', backdropFilter: 'blur(5px)'\n        }}\n      >\n        ← Return to Lobby\n      </Link>"
REPLACEMENT:
"  return (\n    <div style={{ \n      display: 'flex', \n      flexDirection: 'column', \n      alignItems: 'center',\n      justifyContent: 'space-evenly',\n      height: 'calc(100vh - 100px)',\n      paddingBottom: '20px'\n    }}>"
--------------

--- MULTI REPLACE ---
--------------

--- MULTI REPLACE ---
--------------

--- MULTI REPLACE ---
--------------

--- MULTI REPLACE ---
TARGET:
        setFireSpreads(result.fireSpreads || [])
        
        setTimeout(() => setIsSpinning(false), 1500)
      }, 1500)
REPLACEMENT:
        setFireSpreads(result.fireSpreads || [])
        
        // Stop reels sequentially
        [0, 1, 2, 3, 4].forEach(cIndex => {
          setTimeout(() => {
            setSpinningReels(prev => {
              const next = [...prev]
              next[cIndex] = false
              return next
            })
          }, cIndex * 150)
        })

        setTimeout(() => setIsSpinning(false), 500 + 4 * 150)
      }, 1500)
--------------

--- MULTI REPLACE ---
TARGET:
        setFireSpreads(result.fireSpreads || [])
        
        // Stop reels sequentially
        [0, 1, 2, 3, 4].forEach(cIndex => {
REPLACEMENT:
        setFireSpreads(result.fireSpreads || [])
        
        // Stop reels sequentially
        ;[0, 1, 2, 3, 4].forEach(cIndex => {
--------------

--- MULTI REPLACE ---
--------------

--- MULTI REPLACE ---
--------------

--- MULTI REPLACE ---
--------------

--- MULTI REPLACE ---
TARGET:
      {/* FULL SCREEN BACKGROUND */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url(/images/haunted_house.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: -1
      }} />
REPLACEMENT:
      {/* FULL SCREEN BACKGROUND */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url(/images/haunted_house.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: -1,
        transform: isFreeSpins ? 'scale(1.05)' : 'scale(1)',
        filter: isFreeSpins ? 'brightness(0.7) contrast(1.2) hue-rotate(30deg)' : 'none',
        transition: 'transform 2s ease-in-out, filter 2s ease-in-out'
      }} />

      {/* ELECTRIC FLASH OVERLAY FOR FREE SPINS */}
      {isFreeSpins && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'cyan',
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
          zIndex: -1,
          animation: 'lightningFlash 3s infinite'
        }} />
      )}
TARGET:
      {/* Add specific CSS for pyramid blocks */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes electricPulseLarge {
REPLACEMENT:
      {/* Add specific CSS for pyramid blocks */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes lightningFlash {
          0% { opacity: 0; }
          5% { opacity: 0.4; }
          10% { opacity: 0; }
          15% { opacity: 0.6; }
          20% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes electricPulseLarge {
--------------

--- MULTI REPLACE ---
TARGET:
import { getFrankensteinState, spinFrankenstein, getGlobalState } from './actions'
REPLACEMENT:
import { getFrankensteinState, spinFrankenstein, getGlobalState, resetFrankensteinState } from './actions'
TARGET:
  }

  if (!user) {
REPLACEMENT:
  }

  const handleReset = async () => {
    if (!user) return
    setIsSpinning(true)
    try {
      const state = await resetFrankensteinState()
      setGameState(state)
      setGrid(INITIAL_GRID)
      setWinningLines([])
      setLastWin(null)
      setJackpotWon(null)
      setLightningSpreads([])
      setFireSpreads([])
    } catch(e) {
      console.error(e)
    } finally {
      setIsSpinning(false)
    }
  }

  if (!user) {
TARGET:
        <button 
          onClick={() => handleSpin('jackpot')} 
          disabled={isSpinning}
          style={{ background: '#330033', color: '#ff00ff', border: '1px solid #ff00ff', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          Force Jackpot
        </button>
      </div>
REPLACEMENT:
        <button 
          onClick={() => handleSpin('jackpot')} 
          disabled={isSpinning}
          style={{ background: '#330033', color: '#ff00ff', border: '1px solid #ff00ff', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          Force Jackpot
        </button>
        <button 
          onClick={handleReset} 
          disabled={isSpinning}
          style={{ background: '#ff0000', color: '#fff', border: '1px solid #ff0000', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem', marginTop: '8px' }}
        >
          Reset Game
        </button>
      </div>
--------------

--- MULTI REPLACE ---
TARGET:
    if (typeof window !== 'undefined' && !ambientMusicRef.current) {
      ambientMusicRef.current = new Audio('/audio/spooky_ambient.ogg')
      ambientMusicRef.current.loop = true
REPLACEMENT:
    if (typeof window !== 'undefined' && !ambientMusicRef.current) {
      ambientMusicRef.current = new Audio('/audio/frankenstein_theme.mp3')
      ambientMusicRef.current.loop = true
--------------

--- REPLACE ---
TARGET:
"      ambientMusicRef.current = new Audio('/audio/spooky_ambient.ogg')"
REPLACEMENT:
"      ambientMusicRef.current = new Audio('/audio/frankenstein_theme.mp3')"
--------------

--- MULTI REPLACE ---
TARGET:
    // Ensure ambient is playing if it was somehow blocked until now
    if (!hasStartedPlaying) {
      setHasStartedPlaying(true)
      hasStartedRef.current = true
      if (ambientMusicRef.current && ambientMusicRef.current.paused && !isMutedRef.current) {
        ambientMusicRef.current.play().catch(console.error)
      }
    }
REPLACEMENT:
    // Ensure ambient is playing if it was somehow blocked until now
    if (ambientMusicRef.current && ambientMusicRef.current.paused && !isMutedRef.current) {
      setHasStartedPlaying(true)
      hasStartedRef.current = true
      ambientMusicRef.current.play().catch(console.error)
    }
--------------

--- REPLACE ---
TARGET:
"          <div style={{ height: '30px', textAlign: 'center', color: '#00aaff', fontWeight: 'bold', textShadow: '0 0 10px #00aaff' }}>\n             {lastWin !== null && lastWin > 0 && `WINNER! +$${lastWin.toLocaleString()}`}\n             {jackpotWon && ` | WON ${jackpotWon} JACKPOT!`}\n          </div>"
REPLACEMENT:
"          <div style={{ minHeight: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '10px' }}>\n            <AnimatePresence>\n              {(lastWin !== null && lastWin > 0) && (\n                <motion.div\n                  key={lastWin}\n                  initial={{ scale: 0.5, opacity: 0, y: 20 }}\n                  animate={{ scale: 1, opacity: 1, y: 0 }}\n                  exit={{ scale: 0.8, opacity: 0 }}\n                  transition={{ type: 'spring', bounce: 0.5 }}\n                  style={{ \n                    color: '#00ffff', \n                    fontWeight: '900', \n                    fontSize: '2.4rem',\n                    textShadow: '0 0 20px #00aaff, 0 0 40px #0055ff, 3px 3px 0 #000',\n                    textTransform: 'uppercase',\n                    letterSpacing: '2px',\n                    lineHeight: '1'\n                  }}>\n                  WINNER! +${lastWin.toLocaleString()}\n                  {jackpotWon && ` | WON ${jackpotWon} JACKPOT!`}\n                </motion.div>\n              )}\n            </AnimatePresence>\n          </div>"
--------------

--- MULTI REPLACE ---
TARGET:
        // Trigger "It's alive!" audio if free spins are newly triggered
        if (!gameState?.isFreeSpinMode && result.newState.isFreeSpinMode) {
          if ('speechSynthesis' in window && !isMutedRef.current) {
            const msg = new SpeechSynthesisUtterance("It's alive!");
            msg.pitch = 0.2; // Deeper, monster-like voice
            msg.rate = 0.8;
            window.speechSynthesis.speak(msg);
          }
        }
REPLACEMENT:
        // Trigger "It's alive!" audio if free spins are newly triggered
        if (!gameState?.isFreeSpinMode && result.newState.isFreeSpinMode) {
          if (!isMutedRef.current) {
            const itsAliveAudio = new Audio('/audio/its-alive.mp3')
            itsAliveAudio.volume = 0.8
            itsAliveAudio.play().catch(console.error)
          }
        }
--------------

--- REPLACE ---
TARGET:
"            const itsAliveAudio = new Audio('/audio/its-alive.mp3')"
REPLACEMENT:
"            const itsAliveAudio = new Audio(`/audio/its-alive.mp3?v=${Date.now()}`)"
--------------

--- REPLACE ---
TARGET:
"            const itsAliveAudio = new Audio(`/audio/its-alive.mp3?v=${Date.now()}`)"
REPLACEMENT:
"            const itsAliveAudio = new Audio(`/audio/its-alive_reverb.mp3?v=${Date.now()}`)"
--------------

--- MULTI REPLACE ---
--------------

--- REPLACE ---
TARGET:
"      paddingBottom: '40px',\n      gap: '20px'\n    }}>"
REPLACEMENT:
"      paddingBottom: '40px',\n      gap: '20px',\n      zoom: 1.25\n    }}>"
--------------

--- REPLACE ---
TARGET:
"  useEffect(() => {\n    isMutedRef.current = isMuted\n    volumeRef.current = volume\n    if (ambientMusicRef.current) {\n      ambientMusicRef.current.muted = isMuted\n      ambientMusicRef.current.volume = volume\n    }\n  }, [isMuted, volume])"
REPLACEMENT:
"  // Dynamic sizing state\n  const [zoomScale, setZoomScale] = useState(1)\n\n  useEffect(() => {\n    isMutedRef.current = isMuted\n    volumeRef.current = volume\n    if (ambientMusicRef.current) {\n      ambientMusicRef.current.muted = isMuted\n      ambientMusicRef.current.volume = volume\n    }\n  }, [isMuted, volume])\n\n  // Calculate dynamic zoom to fit screen\n  useEffect(() => {\n    const handleResize = () => {\n      if (typeof window === 'undefined') return\n      \n      // The game UI requires roughly 850px of vertical space and 700px of horizontal space\n      const availableHeight = window.innerHeight - 100 // Subtract header height\n      const availableWidth = window.innerWidth - 300  // Subtract side panels\n      \n      const heightScale = availableHeight / 850\n      const widthScale = availableWidth / 700\n      \n      // Use the smaller scale so it fits both dimensions, bounded between 0.5 and 1.5\n      const newScale = Math.max(0.5, Math.min(1.5, Math.min(heightScale, widthScale)))\n      setZoomScale(newScale)\n    }\n    \n    // Initial calculation\n    handleResize()\n    \n    window.addEventListener('resize', handleResize)\n    return () => window.removeEventListener('resize', handleResize)\n  }, [])"
--------------

--- REPLACE ---
TARGET:
"      paddingBottom: '40px',\n      gap: '20px',\n      zoom: 1.25\n    }}>"
REPLACEMENT:
"      paddingBottom: '40px',\n      gap: '20px',\n      zoom: zoomScale\n    }}>"
--------------

--- REPLACE ---
TARGET:
"  const hasStartedRef = useRef(false)"
REPLACEMENT:
"  const hasStartedRef = useRef(false)\n  const audioCtxRef = useRef<AudioContext | null>(null)\n\n  useEffect(() => {\n    let tickInterval: NodeJS.Timeout;\n    if (isSpinning && !isMuted) {\n      if (!audioCtxRef.current) {\n        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;\n        if (AudioContext) audioCtxRef.current = new AudioContext();\n      }\n      \n      const playTick = () => {\n        if (!audioCtxRef.current) return;\n        const ctx = audioCtxRef.current;\n        if (ctx.state === 'suspended') ctx.resume();\n        try {\n          const oscillator = ctx.createOscillator();\n          const gainNode = ctx.createGain();\n\n          oscillator.type = 'triangle';\n          oscillator.frequency.setValueAtTime(800, ctx.currentTime);\n          oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);\n\n          gainNode.gain.setValueAtTime(volumeRef.current * 0.1, ctx.currentTime);\n          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);\n\n          oscillator.connect(gainNode);\n          gainNode.connect(ctx.destination);\n\n          oscillator.start(ctx.currentTime);\n          oscillator.stop(ctx.currentTime + 0.05);\n        } catch (e) {}\n      };\n      \n      tickInterval = setInterval(playTick, 80);\n    }\n    return () => clearInterval(tickInterval);\n  }, [isSpinning, isMuted])"
--------------

--- REPLACE ---
TARGET:
"        // Stop reels sequentially\n        ;[0, 1, 2, 3, 4].forEach(cIndex => {\n          setTimeout(() => {\n            setSpinningReels(prev => {\n              const next = [...prev]\n              next[cIndex] = false\n              return next\n            })\n          }, cIndex * 150)\n        })\n\n        setTimeout(() => setIsSpinning(false), 500 + 4 * 150)\n      }, 1500)\n    } catch (e) {\n      clearInterval(spinInterval)"
REPLACEMENT:
"        // Stop reels sequentially\n        ;[0, 1, 2, 3, 4].forEach(cIndex => {\n          setTimeout(() => {\n            setSpinningReels(prev => {\n              const next = [...prev]\n              next[cIndex] = false\n              return next\n            })\n          }, cIndex * 150)\n        })\n\n        setTimeout(() => setIsSpinning(false), 4 * 150)\n      }, 1500)\n    } catch (e) {\n      clearInterval(spinInterval)"
--------------

--- REPLACE ---
TARGET:
"        // Stop reels sequentially\n        ;[0, 1, 2, 3, 4].forEach(cIndex => {\n          setTimeout(() => {\n            setSpinningReels(prev => {\n              const next = [...prev]\n              next[cIndex] = false\n              return next\n            })\n          }, cIndex * 150)\n        })\n\n        setTimeout(() => setIsSpinning(false), 4 * 150)"
REPLACEMENT:
"        // Stop reels sequentially\n        ;[0, 1, 2, 3, 4].forEach(cIndex => {\n          setTimeout(() => {\n            setSpinningReels(prev => {\n              const next = [...prev]\n              next[cIndex] = false\n              return next\n            })\n          }, cIndex * 150)\n        })\n\n        setTimeout(() => setIsSpinning(false), 150 + 4 * 150)"
--------------

--- REPLACE ---
TARGET:
"        // Stop reels sequentially\n        ;[0, 1, 2, 3, 4].forEach(cIndex => {\n          setTimeout(() => {\n            setSpinningReels(prev => {\n              const next = [...prev]\n              next[cIndex] = false\n              return next\n            })\n          }, cIndex * 150)\n        })\n\n        setTimeout(() => setIsSpinning(false), 150 + 4 * 150)"
REPLACEMENT:
"        // Stop reels sequentially\n        ;[0, 1, 2, 3, 4].forEach(cIndex => {\n          setTimeout(() => {\n            setSpinningReels(prev => {\n              const next = [...prev]\n              next[cIndex] = false\n              return next\n            })\n          }, cIndex * 150)\n        })\n\n        setTimeout(() => setIsSpinning(false), 250 + 4 * 150)"
--------------

--- MULTI REPLACE ---
--------------

--- REPLACE ---
TARGET:
"        {/* PYRAMID NUMBERS DISPLAY */}\n        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>\n          {[1000, 500, 300].map(n => <div key={n} className={`pyramid-block ${isFreeSpins ? 'electric-perimeter' : ''}`}>{n}</div>)}\n        </div>\n        <div style={{ display: 'flex', gap: '8px' }}>\n          {[200, 150, 120].map(n => <div key={n} className={`pyramid-block ${isFreeSpins ? 'electric-perimeter' : ''}`}>{n}</div>)}\n        </div>\n        <div style={{ display: 'flex', gap: '8px' }}>\n          {[100, 80, 60].map(n => <div key={n} className={`pyramid-block ${isFreeSpins ? 'electric-perimeter' : ''}`}>{n}</div>)}\n        </div>\n      </div>\n\n      {/* MULTIPLIER / FREE SPINS STATUS */}\n      <AnimatePresence>\n        {isFreeSpins && (\n          <motion.div \n            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}\n            style={{\n              background: 'linear-gradient(90deg, #aa0000, #ff5500)',\n              padding: '10px 40px', borderRadius: '30px', border: '3px solid #ffaa00',\n              color: '#fff', fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '10px',\n              boxShadow: '0 0 20px #ff5500', textShadow: '0 0 10px rgba(0,0,0,0.8)'\n            }}\n          >\n            FREE SPINS: {gameState.freeSpinsRemaining} | MULTIPLIER: {gameState.currentMultiplier}X\n          </motion.div>\n        )}\n      </AnimatePresence>\n\n      {/* 3D SLOT MACHINE CONTAINER */}\n      <div style={{ perspective: '1000px', marginBottom: '20px' }}>\n        <div className={isFreeSpins ? \"electric-perimeter\" : \"\"} style={{\n          transform: 'rotateX(5deg)',\n          background: 'rgba(0, 0, 20, 0.8)',\n          border: '4px solid #00aaff',\n          boxShadow: '0 0 40px #0055ff, inset 0 0 20px #00aaff',\n          borderRadius: '16px',\n          padding: '20px',\n          display: 'flex', flexDirection: 'column', gap: '10px',\n          width: '500px'\n        }}>\n          \n          <div style
<truncated 4188 bytes>
REPLACEMENT:
"        </div>\n\n        {/* PROGRESSIVE JACKPOTS */}\n        {globalJackpots && (\n          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'center' }}>\n            <div style={{ background: 'linear-gradient(180deg, #500, #f50)', padding: '5px 15px', borderRadius: '8px', border: '2px solid #ffaa00', textAlign: 'center', color: '#fff', fontWeight: 'bold', textShadow: '0 0 5px #000' }}>GRAND<br/>${globalJackpots.grand.toLocaleString()}</div>\n            <div style={{ background: 'linear-gradient(180deg, #500, #f50)', padding: '5px 15px', borderRadius: '8px', border: '2px solid #ffaa00', textAlign: 'center', color: '#fff', fontWeight: 'bold', textShadow: '0 0 5px #000' }}>MAJOR<br/>${globalJackpots.major.toLocaleString()}</div>\n            <div style={{ background: 'linear-gradient(180deg, #005, #05f)', padding: '5px 15px', borderRadius: '8px', border: '2px solid #00ffff', textAlign: 'center', color: '#fff', fontWeight: 'bold', textShadow: '0 0 5px #000' }}>MINOR<br/>${globalJackpots.minor.toLocaleString()}</div>\n            <div style={{ background: 'linear-gradient(180deg, #005, #05f)', padding: '5px 15px', borderRadius: '8px', border: '2px solid #00ffff', textAlign: 'center', color: '#fff', fontWeight: 'bold', textShadow: '0 0 5px #000' }}>MINI<br/>${globalJackpots.mini.toLocaleString()}</div>\n          </div>\n        )}\n      </div>\n\n      {/* MULTIPLIER / FREE SPINS STATUS */}\n      <AnimatePresence>\n        {isFreeSpins && (\n          <motion.div \n            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}\n            style={{\n              background: 'linear-gradient(90deg, #aa0000, #ff5500)',\n              padding: '10px 40px', borderRadius: '30px', border: '3px solid #ffaa00',\n              color: '#fff', fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '10px',\n              boxShadow: '0 0 20px #ff5500', textShadow: '0 0 10px rgba(0,0,0,0.8)'\n            }}\n          >\n            FREE SPINS: {gameS
<truncated 7086 bytes>
--------------

--- REPLACE ---
TARGET:
"        if (result.powerUpTriggered && !isMutedRef.current) {\n           // Maybe play \"I need more power!\" sound\n        }\n\n        // Trigger \"It's alive!\" audio\n        if (result.aliveTriggered && !isMutedRef.current) {\n          const itsAliveAudio = new Audio(`/audio/its-alive_reverb.mp3?v=${Date.now()}`)\n          itsAliveAudio.volume = volumeRef.current\n          itsAliveAudio.play().catch(console.error)\n        }\n        \n        setGameState(result.newState)"
REPLACEMENT:
"        if (result.powerUpTriggered && !isMutedRef.current) {\n          if ('speechSynthesis' in window) {\n            const msg = new SpeechSynthesisUtterance(\"I need more power!\");\n            msg.pitch = 0.5;\n            msg.rate = 1.1;\n            msg.volume = volumeRef.current;\n            window.speechSynthesis.speak(msg);\n          }\n        }\n\n        // Trigger \"It's alive!\" audio\n        if (result.aliveTriggered && !isMutedRef.current) {\n          const itsAliveAudio = new Audio(`/audio/its-alive_reverb.mp3?v=${Date.now()}`)\n          itsAliveAudio.volume = volumeRef.current\n          itsAliveAudio.play().catch(console.error)\n          \n          try {\n            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;\n            const ctx = new AudioContext();\n            const noise = ctx.createBufferSource();\n            const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);\n            const data = buffer.getChannelData(0);\n            for (let i = 0; i < ctx.sampleRate * 2; i++) {\n              data[i] = Math.random() * 2 - 1;\n            }\n            noise.buffer = buffer;\n            const filter = ctx.createBiquadFilter();\n            filter.type = 'lowpass';\n            filter.frequency.value = 800;\n            const gain = ctx.createGain();\n            gain.gain.setValueAtTime(volumeRef.current * 0.8, ctx.currentTime);\n            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);\n            noise.connect(filter);\n            filter.connect(gain);\n            gain.connect(ctx.destination);\n            noise.start();\n          } catch(e) {}\n        }\n        \n        setGameState(result.newState)"
--------------

--- REPLACE ---
TARGET:
"      {/* JACKPOT & PYRAMID DISPLAY */}\n      <div style={{ \n        display: 'flex', flexDirection: 'column', alignItems: 'center', \n        gap: '4px', width: '600px', transform: 'scale(0.85)', transformOrigin: 'top center',\n        marginBottom: '-40px' // offset the scale empty space\n      }}>\n        \n        {/* Row 1: GRAND */}\n        <div className={`jackpot-block grand-block ${isFreeSpins ? 'electric-perimeter' : ''}`} style={{ width: '100%', animation: jackpotWon === 'GRAND' ? 'pulse 0.5s infinite alternate' : 'none' }}>\n          <div className=\"jackpot-amount\">${(globalJackpots?.grand || JACKPOT_MULT['GRAND'] * betAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>\n          <div className=\"jackpot-label\">GRAND</div>\n        </div>\n\n        {/* Row 2: SUPER & MAJOR */}\n        <div style={{ display: 'flex', gap: '4px', width: '100%' }}>\n          <div className={`jackpot-block ${isFreeSpins ? 'electric-perimeter' : ''}`} style={{ flex: 1, animation: jackpotWon === 'SUPER' ? 'pulse 0.5s infinite alternate' : 'none' }}>\n            <div className=\"jackpot-amount\">${(globalJackpots?.super || JACKPOT_MULT['SUPER'] * betAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>\n            <div className=\"jackpot-label\">SUPER</div>\n          </div>\n          <div className={`jackpot-block ${isFreeSpins ? 'electric-perimeter' : ''}`} style={{ flex: 1, animation: jackpotWon === 'MAJOR' ? 'pulse 0.5s infinite alternate' : 'none' }}>\n            <div className=\"jackpot-amount\">${(globalJackpots?.major || JACKPOT_MULT['MAJOR'] * betAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>\n            <div className=\"jackpot-label\">MAJOR</div>\n          </div>\n        </div>\n\n        {/* Row 3: MAXI, MINOR, MINI */}\n        <div style={{ display: 'flex', gap: '4px', width: '100%' }}>\n          <div className={`jackpot-block ${isFreeSpins ? 'electric-perimete
<truncated 2710 bytes>
REPLACEMENT:
"      {/* PROGRESSIVE JACKPOTS */}\n      <div style={{ \n        display: 'flex', flexDirection: 'column', alignItems: 'center', \n        gap: '4px', width: '600px', transform: 'scale(0.85)', transformOrigin: 'top center',\n        marginBottom: '-20px'\n      }}>\n        {globalJackpots && (\n          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'center' }}>\n            <div style={{ background: 'linear-gradient(180deg, #500, #f50)', padding: '5px 15px', borderRadius: '8px', border: '2px solid #ffaa00', textAlign: 'center', color: '#fff', fontWeight: 'bold', textShadow: '0 0 5px #000' }}>GRAND<br/>${globalJackpots.grand.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>\n            <div style={{ background: 'linear-gradient(180deg, #500, #f50)', padding: '5px 15px', borderRadius: '8px', border: '2px solid #ffaa00', textAlign: 'center', color: '#fff', fontWeight: 'bold', textShadow: '0 0 5px #000' }}>MAJOR<br/>${globalJackpots.major.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>\n            <div style={{ background: 'linear-gradient(180deg, #500, #f50)', padding: '5px 15px', borderRadius: '8px', border: '2px solid #ffaa00', textAlign: 'center', color: '#fff', fontWeight: 'bold', textShadow: '0 0 5px #000' }}>SUPER<br/>${globalJackpots.super.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>\n            <div style={{ background: 'linear-gradient(180deg, #005, #05f)', padding: '5px 15px', borderRadius: '8px', border: '2px solid #00ffff', textAlign: 'center', color: '#fff', fontWeight: 'bold', textShadow: '0 0 5px #000' }}>MAXI<br/>${globalJackpots.maxi.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>\n            <div style={{ background: 'linear-gradient(180deg, #005, #05f)', padding: '5px 15px', borderRadius: '8px', border: '2px solid #00ffff', textAlign: 'center', color: '#fff', fontWeight: 'bold', textShadow: '0 0 5px #00
<truncated 523 bytes>
--------------

--- REPLACE ---
TARGET:
"      {/* 3D SLOT MACHINE CONTAINER */}\n      <div style={{ perspective: '1000px', marginBottom: '20px' }}>\n        <div className={isFreeSpins ? \"electric-perimeter\" : \"\"} style={{\n          transform: 'rotateX(5deg)',\n          background: 'rgba(0, 0, 20, 0.8)',\n          border: '4px solid #00aaff',\n          boxShadow: '0 0 40px #0055ff, inset 0 0 20px #00aaff',\n          borderRadius: '16px',\n          padding: '20px',\n          display: 'flex', flexDirection: 'column', gap: '10px',\n          width: '560px'\n        }}>\n          \n          <div style={{ minHeight: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '10px' }}>\n            <AnimatePresence>\n              {(lastWin !== null && lastWin > 0) && (\n                <motion.div\n                  key={lastWin}\n                  initial={{ scale: 0.5, opacity: 0, y: 20 }}\n                  animate={{ scale: 1, opacity: 1, y: 0 }}\n                  exit={{ scale: 0.8, opacity: 0 }}\n                  transition={{ type: 'spring', bounce: 0.5 }}\n                  style={{ \n                    color: '#00ffff', \n                    fontWeight: '900', \n                    fontSize: '2.4rem',\n                    textShadow: '0 0 20px #00aaff, 0 0 40px #0055ff, 3px 3px 0 #000',\n                    textTransform: 'uppercase',\n                    letterSpacing: '2px',\n                    lineHeight: '1'\n                  }}>\n                  WINNER! +${lastWin.toLocaleString()}\n                  {jackpotWon && ` | WON ${jackpotWon} JACKPOT!`}\n                </motion.div>\n              )}\n            </AnimatePresence>\n          </div>\n\n          {/* TOP BOARD (Reels 2-5) */}\n          <div style={{ display: 'flex', gap: '10px', marginLeft: '130px' }}>\n            {[0, 1, 2, 3].map(i => {\n              const persistentPrizes = gameState?.persistentPrizes ? JSON.parse(gameState.persistentPrizes) : [100, 150, 250, 400]\n              const persistentMultipliers = gameState?.persiste
<truncated 4229 bytes>
REPLACEMENT:
"      {/* 3D SLOT MACHINE CONTAINER */}\n      <div style={{ perspective: '1000px', marginBottom: '20px' }}>\n        <div className={isFreeSpins ? \"electric-perimeter\" : \"\"} style={{\n          transform: 'rotateX(5deg)',\n          background: 'rgba(0, 0, 20, 0.8)',\n          border: '4px solid #00aaff',\n          boxShadow: '0 0 40px #0055ff, inset 0 0 20px #00aaff',\n          borderRadius: '16px',\n          padding: '12px',\n          display: 'flex', flexDirection: 'column', gap: '8px',\n          width: '504px'\n        }}>\n          \n          <div style={{ minHeight: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '4px' }}>\n            <AnimatePresence>\n              {(lastWin !== null && lastWin > 0) && (\n                <motion.div\n                  key={lastWin}\n                  initial={{ scale: 0.5, opacity: 0, y: 20 }}\n                  animate={{ scale: 1, opacity: 1, y: 0 }}\n                  exit={{ scale: 0.8, opacity: 0 }}\n                  transition={{ type: 'spring', bounce: 0.5 }}\n                  style={{ \n                    color: '#00ffff', \n                    fontWeight: '900', \n                    fontSize: '2rem',\n                    textShadow: '0 0 20px #00aaff, 0 0 40px #0055ff, 3px 3px 0 #000',\n                    textTransform: 'uppercase',\n                    letterSpacing: '2px',\n                    lineHeight: '1'\n                  }}>\n                  WINNER! +${lastWin.toLocaleString()}\n                  {jackpotWon && ` | WON ${jackpotWon} JACKPOT!`}\n                </motion.div>\n              )}\n            </AnimatePresence>\n          </div>\n\n          {/* TOP BOARD (Reels 2-5) */}\n          <div style={{ display: 'flex', gap: '10px', marginLeft: '130px' }}>\n            {[0, 1, 2, 3].map(i => {\n              const persistentPrizes = gameState?.persistentPrizes ? JSON.parse(gameState.persistentPrizes) : [100, 150, 250, 400]\n              const persistentMultipliers = gameState?.persistentMu
<truncated 4388 bytes>
--------------

--- REPLACE ---
TARGET:
"      <div style={{ \n        display: 'flex', flexDirection: 'column', alignItems: 'center', \n        gap: '4px', width: '600px', transform: 'scale(0.85)', transformOrigin: 'top center',\n        marginBottom: '-20px'\n      }}>\n        {globalJackpots && (\n          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'center' }}>\n            <div style={{ background: 'linear-gradient(180deg, #500, #f50)', padding: '5px 15px', borderRadius: '8px', border: '2px solid #ffaa00', textAlign: 'center', color: '#fff', fontWeight: 'bold', textShadow: '0 0 5px #000' }}>GRAND<br/>${globalJackpots.grand.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>\n            <div style={{ background: 'linear-gradient(180deg, #500, #f50)', padding: '5px 15px', borderRadius: '8px', border: '2px solid #ffaa00', textAlign: 'center', color: '#fff', fontWeight: 'bold', textShadow: '0 0 5px #000' }}>MAJOR<br/>${globalJackpots.major.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>\n            <div style={{ background: 'linear-gradient(180deg, #500, #f50)', padding: '5px 15px', borderRadius: '8px', border: '2px solid #ffaa00', textAlign: 'center', color: '#fff', fontWeight: 'bold', textShadow: '0 0 5px #000' }}>SUPER<br/>${globalJackpots.super.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>\n            <div style={{ background: 'linear-gradient(180deg, #005, #05f)', padding: '5px 15px', borderRadius: '8px', border: '2px solid #00ffff', textAlign: 'center', color: '#fff', fontWeight: 'bold', textShadow: '0 0 5px #000' }}>MAXI<br/>${globalJackpots.maxi.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>\n            <div style={{ background: 'linear-gradient(180deg, #005, #05f)', padding: '5px 15px', borderRadius: '8px', border: '2px solid #00ffff', textAlign: 'center', color: '#fff', fontWeight: 'bold', textShadow: '0 0 5px #000' }}>MINOR<br/>${globalJackpots.min
<truncated 487 bytes>
REPLACEMENT:
"      <div style={{ \n        display: 'flex', flexDirection: 'column', alignItems: 'center', \n        gap: '4px', width: '600px', transform: 'scale(0.85)', transformOrigin: 'top center',\n        marginBottom: '10px'\n      }}>\n        {globalJackpots && (\n          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', alignItems: 'center' }}>\n            {/* Top row: GRAND */}\n            <div style={{ display: 'flex', justifyContent: 'center' }}>\n              <div style={{ background: 'linear-gradient(180deg, #500, #f50)', padding: '5px 30px', borderRadius: '8px', border: '2px solid #ffaa00', textAlign: 'center', color: '#fff', fontWeight: 'bold', textShadow: '0 0 5px #000', fontSize: '1.2rem', minWidth: '220px', boxShadow: '0 0 10px #f50' }}>GRAND<br/>${globalJackpots.grand.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>\n            </div>\n            {/* Second row: SUPER, MAJOR */}\n            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>\n              <div style={{ background: 'linear-gradient(180deg, #500, #f50)', padding: '5px 20px', borderRadius: '8px', border: '2px solid #ffaa00', textAlign: 'center', color: '#fff', fontWeight: 'bold', textShadow: '0 0 5px #000', minWidth: '160px', boxShadow: '0 0 8px #f50' }}>SUPER<br/>${globalJackpots.super.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>\n              <div style={{ background: 'linear-gradient(180deg, #500, #f50)', padding: '5px 20px', borderRadius: '8px', border: '2px solid #ffaa00', textAlign: 'center', color: '#fff', fontWeight: 'bold', textShadow: '0 0 5px #000', minWidth: '160px', boxShadow: '0 0 8px #f50' }}>MAJOR<br/>${globalJackpots.major.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>\n            </div>\n            {/* Third row: MAXI, MINOR, MINI */}\n            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>\n              <div
<truncated 1250 bytes>
--------------

--- MULTI REPLACE ---
--------------

--- REPLACE ---
TARGET:
"      {/* MASSIVE PROGRESSIVE & CREDIT PYRAMID */}\n      <div style={{ \n        display: 'flex', flexDirection: 'column', alignItems: 'center', \n        gap: '4px', width: '600px', transform: 'scale(0.85)', transformOrigin: 'top center',\n        marginBottom: '10px'\n      }}>\n        {globalJackpots && (() => {\n          const mults = gameState?.persistentMultipliers ? JSON.parse(gameState.persistentMultipliers) : Array(15).fill(1);\n          \n          const getBox = (label: string, value: string, multIndex: number, type: 'red' | 'blue', width: string) => {\n            const m = mults[multIndex] || 1;\n            const isRed = type === 'red';\n            return (\n              <div style={{ position: 'relative', width }}>\n                {m > 1 && (\n                  <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#ff0', color: '#000', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', zIndex: 10, boxShadow: '0 0 10px #ff0' }}>{m}x</div>\n                )}\n                <div style={{ \n                  background: isRed ? 'linear-gradient(180deg, #500, #f50)' : 'linear-gradient(180deg, #005, #05f)', \n                  padding: label ? '5px 0' : '10px 0', borderRadius: '8px', \n                  border: isRed ? '2px solid #ffaa00' : '2px solid #00ffff', \n                  textAlign: 'center', color: '#fff', fontWeight: 'bold', textShadow: '0 0 5px #000', \n                  width: '100%', boxShadow: isRed ? '0 0 8px #f50' : '0 0 8px #00f',\n                  fontSize: isRed ? '1rem' : '1.4rem'\n                }}>\n                  {label && <>{label}<br/></>}{value}\n                </div>\n              </div>\n            )\n          }\n\n          return (\n            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', alignItems: 'center' }}>\n              {/* --- RED JACKPOTS (Indices 0 to 5) --- */}\n              <div style={{ dis
<truncated 1251 bytes>
REPLACEMENT:
"      {/* MASSIVE PROGRESSIVE & CREDIT PYRAMID */}\n      <div style={{ \n        display: 'flex', flexDirection: 'column', alignItems: 'center', \n        gap: '4px', width: '600px', transform: 'scale(0.85)', transformOrigin: 'top center',\n        marginBottom: '-15px'\n      }}>\n        {globalJackpots && (() => {\n          const mults = gameState?.persistentMultipliers ? JSON.parse(gameState.persistentMultipliers) : Array(15).fill(1);\n          \n          const getBox = (label: string, value: string, multIndex: number, type: 'red' | 'blue', width: string) => {\n            const m = mults[multIndex] || 1;\n            const isRed = type === 'red';\n            return (\n              <div style={{ position: 'relative', width }}>\n                {m > 1 && (\n                  <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#ff0', color: '#000', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', zIndex: 10, boxShadow: '0 0 10px #ff0' }}>{m}x</div>\n                )}\n                <div style={{ \n                  background: isRed ? 'linear-gradient(180deg, #500, #f50)' : 'linear-gradient(180deg, #005, #05f)', \n                  padding: isRed ? '14px 0' : '10px 0', borderRadius: '8px', \n                  border: isRed ? '2px solid #ffaa00' : '2px solid #00ffff', \n                  textAlign: 'center', color: '#fff', fontWeight: 'bold', textShadow: '0 0 5px #000', \n                  width: '100%', boxShadow: isRed ? '0 0 8px #f50' : '0 0 8px #00f',\n                  fontSize: isRed ? '1.1rem' : '1.4rem'\n                }}>\n                  {label && <>{label}<br/></>}{value}\n                </div>\n              </div>\n            )\n          }\n\n          return (\n            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', alignItems: 'center' }}>\n              {/* --- RED JACKPOTS (Indices 0 to 5) --- */}\n              <div style={{
<truncated 1255 bytes>
--------------

--- MULTI REPLACE ---
--------------

--- REPLACE ---
TARGET:
"      {/* MULTIPLIER / FREE SPINS STATUS */}\n      <AnimatePresence>\n        {isFreeSpins && (\n          <div style={{ position: 'fixed', right: '40px', top: '50%', transform: 'translateY(-50%)', zIndex: 100 }}>"
REPLACEMENT:
"      {/* MULTIPLIER / FREE SPINS STATUS */}\n      <AnimatePresence>\n        {isFreeSpins && (\n          <div style={{ position: 'fixed', left: '40px', top: '50%', transform: 'translateY(-50%)', zIndex: 100 }}>"
--------------

--- MULTI REPLACE ---
--------------

--- MULTI REPLACE ---
TARGET:
  const [betAmount, setBetAmount] = useState(10)
  
REPLACEMENT:
  const [betAmount, setBetAmount] = useState(10)
  const [oddsMultiplier, setOddsMultiplier] = useState(1.0)
  
TARGET:
    try {
      const result = await spinFrankenstein(betAmount, cheat)
      
REPLACEMENT:
    try {
      const result = await spinFrankenstein(betAmount, cheat, oddsMultiplier)
      
TARGET:
        {/* Audio Controls */}
        <div style={{
REPLACEMENT:
        {/* Odds Microtuner */}
        <div style={{
          background: 'rgba(0,0,0,0.6)', border: '2px solid #ffaa00', borderRadius: '15px',
          padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '4px',
          boxShadow: '0 0 10px #ffaa00'
        }}>
          <div style={{ color: '#ffaa00', fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Odds: {oddsMultiplier.toFixed(1)}X</div>
          <input 
            type="range" min="0.1" max="3.0" step="0.1" value={oddsMultiplier} 
            onChange={(e) => setOddsMultiplier(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#ffaa00', cursor: 'pointer' }}
          />
        </div>

        {/* Audio Controls */}
        <div style={{
--------------

--- MULTI REPLACE ---
TARGET:
  const [betAmount, setBetAmount] = useState(10)
  const [oddsMultiplier, setOddsMultiplier] = useState(1.0)
  
REPLACEMENT:
  const [betAmount, setBetAmount] = useState(10)
  
TARGET:
    try {
      const result = await spinFrankenstein(betAmount, cheat, oddsMultiplier)
      
REPLACEMENT:
    try {
      const result = await spinFrankenstein(betAmount, cheat)
      
TARGET:
        {/* Odds Microtuner */}
        <div style={{
          background: 'rgba(0,0,0,0.6)', border: '2px solid #ffaa00', borderRadius: '15px',
          padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '4px',
          boxShadow: '0 0 10px #ffaa00'
        }}>
          <div style={{ color: '#ffaa00', fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Odds: {oddsMultiplier.toFixed(1)}X</div>
          <input 
            type="range" min="0.1" max="3.0" step="0.1" value={oddsMultiplier} 
            onChange={(e) => setOddsMultiplier(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#ffaa00', cursor: 'pointer' }}
          />
        </div>

        {/* Audio Controls */}
        <div style={{
REPLACEMENT:
        {/* Audio Controls */}
        <div style={{
--------------

