import re

with open('src/app/games/frankenstein/actions.ts', 'r') as f:
    act = f.read()

# Fix jackpotWon references
act = act.replace('result: JSON.stringify({ grid, winningLines, jackpotWon, scatterCount })', 'result: JSON.stringify({ grid, winningLines, jackpotWon: null, scatterCount })')
act = act.replace('jackpotWon,\n    jackpotAmount,', 'jackpotWon: null,\n    jackpotAmount: jackpotWinAmount,')

with open('src/app/games/frankenstein/actions.ts', 'w') as f:
    f.write(act)

with open('src/app/games/frankenstein/page.tsx', 'r') as f:
    page = f.read()

# Fix missing states
missing_states = """const [isSpinning, setIsSpinning] = useState(false)
  const [winAmount, setWinAmount] = useState(0)
  const [lineWins, setLineWins] = useState<number[]>([])"""
page = page.replace('const [isSpinning, setIsSpinning] = useState(false)', missing_states)

with open('src/app/games/frankenstein/page.tsx', 'w') as f:
    f.write(page)

print("Fixed TS errors")
