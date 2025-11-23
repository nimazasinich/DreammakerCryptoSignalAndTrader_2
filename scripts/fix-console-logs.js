#!/usr/bin/env node

/**
 * Script to automatically replace console.log with Logger
 * Usage: node scripts/fix-console-logs.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('dist') && !file.includes('.git')) {
        await getAllFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

function addLoggerImport(content, file) {
  // بررسی اینکه آیا از console استفاده می‌شود
  if (!content.includes('console.log') && !content.includes('console.error') && !content.includes('console.warn')) {
    return { content, modified: false };
  }

  // بررسی اینکه آیا Logger قبلاً import شده
  if (content.includes("import { Logger }") || content.includes("import {Logger}")) {
    return { content, modified: false };
  }

  let modified = false;

  // تعیین مسیر نسبی برای Logger
  const relativePath = path.relative(path.dirname(file), path.join(__dirname, '../src/core')).replace(/\\/g, '/');
  const loggerImport = `import { Logger } from '${relativePath || '..'}/core/Logger.js';\n`;

  // اضافه کردن import
  if (content.includes('import')) {
    content = content.replace(/(import[^;]+;(\r?\n)*)/, `$1${loggerImport}`);
  } else {
    content = loggerImport + content;
  }

  // اضافه کردن logger instance
  if (content.includes('export class')) {
    // برای کلاس‌ها
    const classMatch = content.match(/export class (\w+)\s*{/);
    if (classMatch) {
      content = content.replace(
        /export class (\w+)\s*{/,
        `export class $1 {\n  private readonly logger = Logger.getInstance();\n`
      );
      modified = true;
    }
  } else if (content.includes('export function') || content.includes('export const')) {
    // برای function ها
    const insertPoint = content.indexOf('export');
    content = content.slice(0, insertPoint) + 
              '\nconst logger = Logger.getInstance();\n\n' + 
              content.slice(insertPoint);
    modified = true;
  }

  return { content, modified };
}

function replaceConsoleLogs(content) {
  let modified = false;
  let replacements = 0;

  // Replace console.log
  const logMatches = content.match(/console\.log\([^)]*\);?/g);
  if (logMatches) {
    for (const match of logMatches) {
      // استخراج arguments
      const argsMatch = match.match(/console\.log\((.*)\)/);
      if (argsMatch) {
        const args = argsMatch[1];
        
        // تبدیل به logger.info
        if (args.includes(',')) {
          // اگر چند آرگومنت داریم
          const parts = args.split(',').map(s => s.trim());
          const message = parts[0];
          const data = parts.slice(1).join(', ');
          const replacement = `logger.info(${message}, { data: ${data} });`;
          content = content.replace(match, replacement);
        } else {
          // اگر فقط یک آرگومنت داریم
          const replacement = `logger.info(${args});`;
          content = content.replace(match, replacement);
        }
        replacements++;
        modified = true;
      }
    }
  }

  // Replace console.error
  const errorMatches = content.match(/console\.error\([^)]*\);?/g);
  if (errorMatches) {
    for (const match of errorMatches) {
      const argsMatch = match.match(/console\.error\((.*)\)/);
      if (argsMatch) {
        const args = argsMatch[1];
        
        if (args.includes(',')) {
          const parts = args.split(',').map(s => s.trim());
          const message = parts[0];
          const error = parts[parts.length - 1];
          const replacement = `logger.error(${message}, {}, ${error});`;
          content = content.replace(match, replacement);
        } else {
          const replacement = `logger.error(${args});`;
          content = content.replace(match, replacement);
        }
        replacements++;
        modified = true;
      }
    }
  }

  // Replace console.warn
  const warnMatches = content.match(/console\.warn\([^)]*\);?/g);
  if (warnMatches) {
    for (const match of warnMatches) {
      const argsMatch = match.match(/console\.warn\((.*)\)/);
      if (argsMatch) {
        const args = argsMatch[1];
        const replacement = `logger.warn(${args});`;
        content = content.replace(match, replacement);
        replacements++;
        modified = true;
      }
    }
  }

  return { content, modified, replacements };
}

async function processFile(file) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    let replacements = 0;

    // اضافه کردن Logger import
    const importResult = addLoggerImport(content, file);
    content = importResult.content;
    if (importResult.modified) modified = true;

    // جایگزینی console.log ها
    const replaceResult = replaceConsoleLogs(content);
    content = replaceResult.content;
    if (replaceResult.modified) {
      modified = true;
      replacements = replaceResult.replacements;
    }

    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Fixed ${replacements} console statements in: ${path.relative(process.cwd(), file)}`);
      return replacements;
    }

    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
    return 0;
  }
}

async function main() {
  console.log('🔍 Scanning for console.log, console.error, console.warn...\n');

  const srcDir = path.join(__dirname, '../src');
  const files = await getAllFiles(srcDir);

  console.log(`📁 Found ${files.length} TypeScript files\n`);

  let totalReplacements = 0;
  let filesModified = 0;

  for (const file of files) {
    const replacements = await processFile(file);
    if (replacements > 0) {
      totalReplacements += replacements;
      filesModified++;
    }
  }

  console.log(`\n🎉 Summary:`);
  console.log(`   Files modified: ${filesModified}`);
  console.log(`   Total replacements: ${totalReplacements}`);
  console.log(`\n✨ All done! Remember to test your application.`);
}

main().catch(console.error);
