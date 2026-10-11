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

let calls = [];

for (const file of files) {
  const fullPath = path.resolve(file);
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  
  let chunks = [];
  
  if (file.endsWith('admin/actions.ts')) {
    for (let i=0; i<lines.length; i++) {
        let original = lines[i];
        let replaced = original;
        replaced = replaced.replace(/chipBalance: number, bankBalance: number/, 'credits: number');
        replaced = replaced.replace(/data\.chipBalance/, 'data.credits');
        if (replaced.includes('bankBalance: data.bankBalance')) {
            replaced = ''; 
        }
        replaced = replaced.replace(/chipBalance, bankBalance/, 'credits');
        replaced = replaced.replace(/chipBalance/g, 'credits');
        if (original !== replaced) {
            chunks.push({
                StartLine: i+1, EndLine: i+1, TargetContent: original, ReplacementContent: replaced, AllowMultiple: true
            });
        }
    }
  } else if (file.endsWith('admin/page.tsx')) {
    for (let i=0; i<lines.length; i++) {
        let original = lines[i];
        let replaced = original;
        replaced = replaced.replace(/chipBalance: 0, bankBalance: 1000/g, 'credits: 1000');
        if (replaced.includes('bankBalance: 1000')) {
            replaced = ''; 
        }
        if (replaced.includes('bankBalance: Number')) {
            replaced = ''; 
        }
        if (replaced.includes('u.bankBalance')) {
            replaced = ''; 
        }
        if (replaced.includes('setEditBank(')) {
            replaced = replaced.replace(/setEditBank\([^)]+\);\s*/g, '');
        }
        replaced = replaced.replace(/chipBalance/g, 'credits');
        
        if (original !== replaced) {
            chunks.push({
                StartLine: i+1, EndLine: i+1, TargetContent: original, ReplacementContent: replaced, AllowMultiple: true
            });
        }
    }
  } else {
      for (let i=0; i<lines.length; i++) {
          let original = lines[i];
          let replaced = original;
          replaced = replaced.replace(/user\.chipBalance/g, 'user.credits');
          replaced = replaced.replace(/user!\.chipBalance/g, 'user!.credits');
          replaced = replaced.replace(/user\?\.chipBalance/g, 'user?.credits');
          
          replaced = replaced.replace(/updateBalances\(([^,]+),\s*[^)]+\)/g, 'updateCredits($1)');
          replaced = replaced.replace(/updateBalances/g, 'updateCredits');
          
          replaced = replaced.replace(/chipBalance/g, 'credits');
          
          if (replaced.includes('bankBalance')) {
              replaced = replaced.replace(/,\s*bankBalance:\s*[^,}]+/g, '');
              replaced = replaced.replace(/bankBalance:\s*[^,}]+,\s*/g, '');
              replaced = replaced.replace(/bankBalance:\s*[^,}]+/g, '');
              replaced = replaced.replace(/,\s*user\.bankBalance/g, '');
              replaced = replaced.replace(/user\.bankBalance/g, '');
          }
          if (original !== replaced) {
              chunks.push({
                  StartLine: i+1, EndLine: i+1, TargetContent: original, ReplacementContent: replaced, AllowMultiple: true
              });
          }
      }
  }

  if (chunks.length > 0) {
      calls.push({
          TargetFile: fullPath,
          Instruction: "Refactor balances to unified credits",
          Description: "Update to use credits instead of chipBalance and bankBalance",
          ReplacementChunks: chunks,
          toolSummary: "Refactoring Balances",
          toolAction: "Updating balance properties"
      });
  }
}

// Group calls into 3 chunks
const batch1 = calls.slice(0, 9);
const batch2 = calls.slice(9, 18);
const batch3 = calls.slice(18);

fs.writeFileSync('b1.json', JSON.stringify(batch1));
fs.writeFileSync('b2.json', JSON.stringify(batch2));
fs.writeFileSync('b3.json', JSON.stringify(batch3));
console.log("Done");
