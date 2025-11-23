// tools/scan-offenders.mjs
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd(), 'src');
const PATTERNS = [
  /localhost:(5173|8001|3002)/,
  /ws:\/\/localhost/,
  /http:\/\/localhost:\d+/,  // Match any hardcoded port
  /ws\/market\/ws\/market/,
  /'http:\/\/localhost:\d+'|"http:\/\/localhost:\d+"/,  // Quoted strings
];

const offenders = [];

function scanFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    for (const re of PATTERNS) {
      const m = line.match(re);
      if (m) {
        offenders.push({
          file: filePath.replace(process.cwd() + path.sep, ''),
          line: idx + 1,
          match: line.trim()
        });
        break;
      }
    }
  });
}

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|jsx|json|mjs|cjs)$/.test(name)) scanFile(p);
  }
}

walk(ROOT);

// CSV
const csv = [
  'file,line,match',
  ...offenders.map(o => `${o.file},${o.line},"${o.match.replaceAll('"', '""')}"`)
].join('\n');
fs.writeFileSync('offenders.csv', csv);

// MD
let md = `| File | Line | Match |\n|---|---:|---|\n`;
for (const o of offenders) {
  const safe = o.match.replaceAll('|', '\\|').replaceAll('`','\\`');
  md += `| ${o.file} | ${o.line} | \`${safe}\` |\n`;
}
fs.writeFileSync('offenders.md', md);

if (offenders.length === 0) {
  console.log('✅ No offenders');
} else {
  console.log(`Found ${offenders.length} offenders. See offenders.csv / offenders.md`);
}
