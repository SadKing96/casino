const fs = require('fs');
const path = require('path');

const files = [
  'src/components/Navbar.tsx',
  'src/app/admin/actions.ts',
  'src/app/admin/page.tsx',
  'src/app/games/piggies/actions.ts',
  'src/app/games/piggies/page.tsx',
  'src/app/games/craps/actions.ts',
  'src/app/games/craps/Table.tsx',
  'src/app/games/sportsbook/actions.ts',
  'src/app/games/sportsbook/SportsbookClient.tsx',
  'src/app/games/baccarat/actions.ts',
  'src/app/games/baccarat/Table.tsx',
  'src/app/games/roulette/actions.ts',
  'src/app/games/frankenstein/actions.ts',
  'src/app/games/frankenstein/page.tsx',
  'src/app/games/buffalo/actions.ts',
  'src/app/games/buffalo/page.tsx',
  'src/app/games/blackjack/actions.ts',
  'src/app/games/blackjack/Table.tsx',
  'src/app/games/holdem/actions.ts',
  'src/app/games/holdem/Table.tsx',
  'src/app/games/crash/actions.ts',
  'src/app/games/crash/Table.tsx',
  'src/app/games/keno/actions.ts',
  'src/app/games/keno/Table.tsx',
  'src/app/games/threecardpoker/actions.ts',
  'src/app/games/threecardpoker/Table.tsx'
];

let out = '';

for (const file of files) {
  const fullPath = path.resolve(file);
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  
  const chunks = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('chipBalance') || line.includes('bankBalance') || line.includes('updateBalances')) {
      // Find a block of lines to replace to ensure uniqueness or just the single line if it's unique
      let startLine = i + 1;
      let endLine = i + 1;
      let targetContent = line;
      let replacementContent = line;

      // Replace logic
      replacementContent = replacementContent.replace(/chipBalance/g, 'credits');
      replacementContent = replacementContent.replace(/bankBalance/g, 'credits'); // wait, bankBalance is removed?
      
      // We will handle specific replacements manually. This script is too dumb to handle all cases safely.
    }
  }
}
