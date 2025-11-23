// tools/replace-8001.js
const fs = require('fs');
const path = require('path');

const exts = new Set(['.ts', '.tsx', '.js', '.jsx']);
const root = path.resolve(process.cwd(), 'src');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, files);
    else if (exts.has(path.extname(entry.name))) files.push(p);
  }
  return files;
}

const httpRegex = /https?:\/\/localhost:8001\/api\/?/g;
const wsRegex = /wss?:\/\/localhost:8001\/ws\/?/g;

let changed = 0;

for (const file of walk(root)) {
  let src = fs.readFileSync(file, 'utf8');
  const orig = src;

  if (!src.includes("from '@/config/env'") && !src.includes('from "@/config/env"') && (httpRegex.test(src) || wsRegex.test(src))) {
    src = src.replace(/(^import .+\n)/, `$1import { endpoints } from '@/config/env';\n`);
  }

  src = src
    .replace(httpRegex, () => '__ENDPOINT_API__')
    .replace(wsRegex, () => '__ENDPOINT_WS__')
    .replace(/__ENDPOINT_API__/g, () => "${endpoints.api('/api')}")
    .replace(/__ENDPOINT_WS__/g, () => "${endpoints.ws('/ws')}");

  if (src !== orig) {
    fs.writeFileSync(file, src, 'utf8');
    changed++;
    console.log('Updated:', file);
  }
}

console.log('Files changed:', changed);

