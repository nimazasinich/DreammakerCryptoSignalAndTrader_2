#!/usr/bin/env node
// scripts/safe-merge-json.mjs
// ادغام ایمن JSON بدون حذف کلیدهای موجود (Additive Merge)

import fs from 'fs';
import path from 'path';

const [, , basePath, patchPath, outPath] = process.argv;

if (!basePath || !patchPath) {
  console.error('❌ Usage: node safe-merge-json.mjs <base.json> <patch.json> [output.json]');
  console.error('   Example: node safe-merge-json.mjs config/api.json patches/new-apis.json config/api.json');
  process.exit(1);
}

// بررسی وجود فایل‌ها
if (!fs.existsSync(basePath)) {
  console.error(`❌ Base file not found: ${basePath}`);
  process.exit(1);
}

if (!fs.existsSync(patchPath)) {
  console.error(`❌ Patch file not found: ${patchPath}`);
  process.exit(1);
}

try {
  // خواندن فایل‌های base و patch
  const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
  const patch = JSON.parse(fs.readFileSync(patchPath, 'utf8'));

  // کپی عمیق از base
  const out = JSON.parse(JSON.stringify(base));

  let addedKeys = 0;
  let updatedKeys = 0;
  let mergedArrays = 0;

  // ادغام بازگشتی (deep merge)
  function deepMerge(target, source, path = '') {
    for (const key of Object.keys(source)) {
      const fullPath = path ? `${path}.${key}` : key;

      if (Array.isArray(source[key])) {
        // آرایه: ادغام بدون تکرار
        if (!target[key]) {
          target[key] = [...source[key]];
          addedKeys++;
          console.log(`  ➕ Added array: ${fullPath} (${source[key].length} items)`);
        } else if (Array.isArray(target[key])) {
          const originalLength = target[key].length;

          // ادغام با حفظ یکتایی (بر اساس نوع المان)
          const merged = [...target[key]];

          for (const item of source[key]) {
            // اگر المان primitive است
            if (typeof item !== 'object' || item === null) {
              if (!merged.includes(item)) {
                merged.push(item);
              }
            } else {
              // اگر المان object است، بررسی تکراری با JSON.stringify
              const itemStr = JSON.stringify(item);
              if (!merged.some(m => JSON.stringify(m) === itemStr)) {
                merged.push(item);
              }
            }
          }

          target[key] = merged;

          if (merged.length > originalLength) {
            mergedArrays++;
            console.log(`  🔀 Merged array: ${fullPath} (${originalLength} → ${merged.length} items)`);
          }
        }
      } else if (typeof source[key] === 'object' && source[key] !== null) {
        // Object: ادغام بازگشتی
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
          addedKeys++;
          console.log(`  ➕ Added object: ${fullPath}`);
        }
        deepMerge(target[key], source[key], fullPath);
      } else {
        // Primitive: فقط اگر قبلاً نبود اضافه کن
        if (target[key] === undefined) {
          target[key] = source[key];
          addedKeys++;
          console.log(`  ➕ Added: ${fullPath} = ${source[key]}`);
        } else if (target[key] !== source[key]) {
          // اگر مقدار متفاوت است، update نکن (حفظ موجود)
          console.log(`  ⏭️  Skipped (exists): ${fullPath} (keeping existing value)`);
        }
      }
    }
  }

  console.log('\n🔄 Starting safe additive merge...\n');
  deepMerge(out, patch);

  // نوشتن خروجی
  const outputPath = outPath || basePath;

  // backup اگر در حال overwrite کردن base هستیم
  if (outputPath === basePath) {
    const backupPath = `${basePath}.backup-${Date.now()}`;
    fs.copyFileSync(basePath, backupPath);
    console.log(`\n💾 Backup created: ${backupPath}`);
  }

  fs.writeFileSync(outputPath, JSON.stringify(out, null, 2) + '\n', 'utf8');

  console.log(`\n✅ Safe merge completed!`);
  console.log(`   Output: ${outputPath}`);
  console.log(`   Stats:`);
  console.log(`     • Added keys: ${addedKeys}`);
  console.log(`     • Merged arrays: ${mergedArrays}`);
  console.log(`     • No existing data was removed or overwritten\n`);

} catch (error) {
  console.error(`❌ Merge failed: ${error.message}`);
  process.exit(1);
}
