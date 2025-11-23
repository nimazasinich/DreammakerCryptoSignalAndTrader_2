#!/usr/bin/env node

/**
 * Script to sanitize API keys and secrets in env.example file
 * Usage: node scripts/sanitize-env-example.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function sanitizeEnvExample() {
  const envExamplePath = path.join(__dirname, '../env.example');
  
  console.log('🔍 Reading env.example file...');
  
  if (!fs.existsSync(envExamplePath)) {
    console.error('❌ env.example file not found!');
    process.exit(1);
  }

  let content = fs.readFileSync(envExamplePath, 'utf8');
  let replacements = 0;

  console.log('🔧 Sanitizing API keys and secrets...\n');

  // Patterns to sanitize
  const patterns = [
    // API Keys
    { 
      pattern: /^(CMC_API_KEY|COINMARKETCAP_API_KEY)=.+$/gm, 
      replacement: '$1=your_coinmarketcap_api_key_here',
      name: 'CoinMarketCap API Key'
    },
    { 
      pattern: /^(CRYPTOCOMPARE_KEY|CRYPTOCOMPARE_API_KEY)=.+$/gm, 
      replacement: '$1=your_cryptocompare_api_key_here',
      name: 'CryptoCompare API Key'
    },
    { 
      pattern: /^(NEWSAPI_KEY|NEWS_API_KEY)=.+$/gm, 
      replacement: '$1=your_newsapi_key_here',
      name: 'NewsAPI Key'
    },
    { 
      pattern: /^(CRYPTOPANIC_KEY|CRYPTOPANIC_API_KEY)=.+$/gm, 
      replacement: '$1=your_cryptopanic_api_key_here',
      name: 'CryptoPanic API Key'
    },
    
    // Blockchain API Keys
    { 
      pattern: /^(ETHERSCAN_API_KEY)=.+$/gm, 
      replacement: '$1=your_etherscan_api_key_here',
      name: 'Etherscan API Key'
    },
    { 
      pattern: /^(BSCSCAN_API_KEY)=.+$/gm, 
      replacement: '$1=your_bscscan_api_key_here',
      name: 'BscScan API Key'
    },
    { 
      pattern: /^(TRONSCAN_API_KEY)=.+$/gm, 
      replacement: '$1=your_tronscan_api_key_here',
      name: 'TronScan API Key'
    },
    
    // Hugging Face
    { 
      pattern: /^(HUGGINGFACE_API_KEY)=.+$/gm, 
      replacement: '$1=your_huggingface_api_key_here',
      name: 'Hugging Face API Key'
    },
    
    // Binance Keys
    { 
      pattern: /^(BINANCE_API_KEY)=.+$/gm, 
      replacement: '$1=your_binance_api_key_here',
      name: 'Binance API Key'
    },
    { 
      pattern: /^(BINANCE_SECRET_KEY|BINANCE_SECRET)=.+$/gm, 
      replacement: '$1=your_binance_secret_key_here',
      name: 'Binance Secret Key'
    },
    
    // Telegram
    { 
      pattern: /^(TELEGRAM_BOT_TOKEN)=.+$/gm, 
      replacement: '$1=your_telegram_bot_token_here',
      name: 'Telegram Bot Token'
    },
    { 
      pattern: /^(TELEGRAM_CHAT_ID)=.+$/gm, 
      replacement: '$1=your_telegram_chat_id_here',
      name: 'Telegram Chat ID'
    },
    
    // Generic patterns
    { 
      pattern: /^([A-Z_]+_API_KEY)=(?!your_|$).+$/gm, 
      replacement: '$1=your_api_key_here',
      name: 'Generic API Key'
    },
    { 
      pattern: /^([A-Z_]+_SECRET)=(?!your_|$).+$/gm, 
      replacement: '$1=your_secret_here',
      name: 'Generic Secret'
    },
    { 
      pattern: /^([A-Z_]+_TOKEN)=(?!your_|$).+$/gm, 
      replacement: '$1=your_token_here',
      name: 'Generic Token'
    }
  ];

  // اعمال تغییرات
  for (const { pattern, replacement, name } of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      console.log(`✅ Sanitized: ${name} (${matches.length} occurrence(s))`);
      replacements += matches.length;
    }
  }

  // ایجاد backup
  const backupPath = envExamplePath + '.backup';
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(envExamplePath, backupPath);
    console.log(`\n💾 Created backup at: ${path.basename(backupPath)}`);
  }

  // نوشتن فایل جدید
  fs.writeFileSync(envExamplePath, content, 'utf8');

  console.log(`\n🎉 Sanitization complete!`);
  console.log(`   Total replacements: ${replacements}`);
  console.log(`   File: env.example`);
  
  if (replacements > 0) {
    console.log(`\n⚠️  Important: Make sure to update your actual .env file with real API keys!`);
  }
}

// اضافه کردن validation
function validateEnvExample() {
  const envExamplePath = path.join(__dirname, '../env.example');
  const content = fs.readFileSync(envExamplePath, 'utf8');
  
  console.log('\n🔍 Validating env.example...');
  
  // الگوهای خطرناک که نباید وجود داشته باشند
  const dangerousPatterns = [
    /[a-f0-9]{32,}/i,  // Hash-like strings (API keys)
    /[A-Z0-9]{20,}/,   // Long alphanumeric strings
    /\d{10,}/          // Long numbers (IDs)
  ];
  
  let hasIssues = false;
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    if (line.trim().startsWith('#') || !line.includes('=')) return;
    
    const [key, value] = line.split('=');
    if (!value) return;
    
    // بررسی اینکه value نباید شامل API key واقعی باشد
    for (const pattern of dangerousPatterns) {
      if (pattern.test(value) && !value.includes('your_') && value.trim() !== '') {
        console.warn(`⚠️  Line ${index + 1}: ${key} might contain a real API key!`);
        hasIssues = true;
      }
    }
  });
  
  if (!hasIssues) {
    console.log('✅ No issues found in env.example');
  } else {
    console.log('\n❌ Please review the warnings above and manually check the file.');
  }
}

// Main execution
try {
  sanitizeEnvExample();
  validateEnvExample();
  console.log('\n✨ Done!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
