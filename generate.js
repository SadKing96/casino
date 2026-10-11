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

let toolCalls = [];

for (const file of files) {
  const fullPath = path.resolve(file);
  const content = fs.readFileSync(fullPath, 'utf-8');
  let lines = content.split('\n');
  
  // Custom manual fixes
  if (file.endsWith('admin/actions.ts')) {
    for (let i=0; i<lines.length; i++) {
        lines[i] = lines[i].replace(/chipBalance: number, bankBalance: number/, 'credits: number');
        lines[i] = lines[i].replace(/data\.chipBalance/, 'data.credits');
        if (lines[i].includes('bankBalance: data.bankBalance')) {
            lines[i] = ''; // remove
        }
        lines[i] = lines[i].replace(/chipBalance, bankBalance/, 'credits');
        lines[i] = lines[i].replace(/chipBalance/g, 'credits');
    }
  } else if (file.endsWith('admin/page.tsx')) {
    for (let i=0; i<lines.length; i++) {
        lines[i] = lines[i].replace(/chipBalance: 0, bankBalance: 1000/g, 'credits: 1000');
        if (lines[i].includes('bankBalance: 1000')) {
            lines[i] = ''; // Remove the duplicate key line
        }
        if (lines[i].includes('bankBalance: Number')) {
            lines[i] = ''; // remove
        }
        if (lines[i].includes('u.bankBalance')) {
            lines[i] = ''; // remove
        }
        if (lines[i].includes('setEditBank(')) {
            lines[i] = lines[i].replace(/setEditBank\([^)]+\);\s*/g, '');
        }
        lines[i] = lines[i].replace(/chipBalance/g, 'credits');
    }
  } else {
      for (let i=0; i<lines.length; i++) {
          lines[i] = lines[i].replace(/user\.chipBalance/g, 'user.credits');
          lines[i] = lines[i].replace(/user!\.chipBalance/g, 'user!.credits');
          lines[i] = lines[i].replace(/user\?\.chipBalance/g, 'user?.credits');
          
          lines[i] = lines[i].replace(/updateBalances\(([^,]+),\s*[^)]+\)/g, 'updateCredits($1)');
          lines[i] = lines[i].replace(/updateBalances/g, 'updateCredits');
          
          lines[i] = lines[i].replace(/chipBalance/g, 'credits');
          
          if (lines[i].includes('bankBalance')) {
              lines[i] = lines[i].replace(/,\s*bankBalance:\s*[^,}]+/g, '');
              lines[i] = lines[i].replace(/bankBalance:\s*[^,}]+,\s*/g, '');
              lines[i] = lines[i].replace(/bankBalance:\s*[^,}]+/g, '');
              lines[i] = lines[i].replace(/,\s*user\.bankBalance/g, '');
          }
      }
  }

  const newContent = lines.join('\n');
  if (content !== newContent) {
    fs.writeFileSync(fullPath, newContent);
  }
}

