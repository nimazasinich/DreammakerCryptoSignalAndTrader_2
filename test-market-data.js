// Simple test script to verify real market data fetching
import axios from 'axios';

// Test multiple free APIs directly
async function testKraken() {
  console.log('\n🔵 Testing Kraken API...');
  try {
    const response = await axios.get('https://api.kraken.com/0/public/Ticker', {
      params: { pair: 'XXBTZUSD,XETHZUSD' },
      timeout: 10000
    });

    if (response.data?.result) {
      const btcData = response.data.result['XXBTZUSD'];
      const ethData = response.data.result['XETHZUSD'];
      console.log('✅ Kraken SUCCESS!');
      console.log(`   BTC Price: $${parseFloat(btcData.c[0]).toLocaleString()}`);
      console.log(`   ETH Price: $${parseFloat(ethData.c[0]).toLocaleString()}`);
      return true;
    }
  } catch (error) {
    console.log('❌ Kraken FAILED:', error.message);
    return false;
  }
}

async function testCoinCap() {
  console.log('\n🟢 Testing CoinCap API...');
  try {
    const btcResponse = await axios.get('https://api.coincap.io/v2/assets/bitcoin', { timeout: 10000 });
    const ethResponse = await axios.get('https://api.coincap.io/v2/assets/ethereum', { timeout: 10000 });

    if (btcResponse.data?.data && ethResponse.data?.data) {
      console.log('✅ CoinCap SUCCESS!');
      console.log(`   BTC Price: $${parseFloat(btcResponse.data.data.priceUsd).toLocaleString()}`);
      console.log(`   ETH Price: $${parseFloat(ethResponse.data.data.priceUsd).toLocaleString()}`);
      return true;
    }
  } catch (error) {
    console.log('❌ CoinCap FAILED:', error.message);
    return false;
  }
}

async function testCoinGecko() {
  console.log('\n🟡 Testing CoinGecko API...');
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'bitcoin,ethereum',
        vs_currencies: 'usd',
        include_24hr_vol: true,
        include_24hr_change: true
      },
      timeout: 10000
    });

    if (response.data?.bitcoin && response.data?.ethereum) {
      console.log('✅ CoinGecko SUCCESS!');
      console.log(`   BTC Price: $${response.data.bitcoin.usd.toLocaleString()}`);
      console.log(`   ETH Price: $${response.data.ethereum.usd.toLocaleString()}`);
      return true;
    }
  } catch (error) {
    console.log('❌ CoinGecko FAILED:', error.message);
    return false;
  }
}

async function testCoinPaprika() {
  console.log('\n🟠 Testing CoinPaprika API...');
  try {
    const btcResponse = await axios.get('https://api.coinpaprika.com/v1/tickers/btc-bitcoin', { timeout: 10000 });
    const ethResponse = await axios.get('https://api.coinpaprika.com/v1/tickers/eth-ethereum', { timeout: 10000 });

    if (btcResponse.data?.quotes?.USD && ethResponse.data?.quotes?.USD) {
      console.log('✅ CoinPaprika SUCCESS!');
      console.log(`   BTC Price: $${btcResponse.data.quotes.USD.price.toLocaleString()}`);
      console.log(`   ETH Price: $${ethResponse.data.quotes.USD.price.toLocaleString()}`);
      return true;
    }
  } catch (error) {
    console.log('❌ CoinPaprika FAILED:', error.message);
    return false;
  }
}

async function testBinance() {
  console.log('\n🟣 Testing Binance API...');
  try {
    const btcResponse = await axios.get('https://api.binance.com/api/v3/ticker/24hr', {
      params: { symbol: 'BTCUSDT' },
      timeout: 10000
    });
    const ethResponse = await axios.get('https://api.binance.com/api/v3/ticker/24hr', {
      params: { symbol: 'ETHUSDT' },
      timeout: 10000
    });

    if (btcResponse.data?.lastPrice && ethResponse.data?.lastPrice) {
      console.log('✅ Binance SUCCESS!');
      console.log(`   BTC Price: $${parseFloat(btcResponse.data.lastPrice).toLocaleString()}`);
      console.log(`   ETH Price: $${parseFloat(ethResponse.data.lastPrice).toLocaleString()}`);
      return true;
    }
  } catch (error) {
    console.log('❌ Binance FAILED:', error.message);
    return false;
  }
}

async function testKrakenOHLCV() {
  console.log('\n📊 Testing Kraken OHLCV Data...');
  try {
    const response = await axios.get('https://api.kraken.com/0/public/OHLC', {
      params: {
        pair: 'XXBTZUSD',
        interval: 60, // 1 hour
        since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) // Last 7 days
      },
      timeout: 10000
    });

    if (response.data?.result) {
      const ohlcData = response.data.result['XXBTZUSD'] || response.data.result[Object.keys(response.data.result)[0]];
      if (Array.isArray(ohlcData) && ohlcData.length > 0) {
        console.log('✅ Kraken OHLCV SUCCESS!');
        console.log(`   Received ${ohlcData.length} candles`);
        const latest = ohlcData[ohlcData.length - 1];
        console.log(`   Latest candle: O:${latest[1]} H:${latest[2]} L:${latest[3]} C:${latest[4]}`);
        return true;
      }
    }
  } catch (error) {
    console.log('❌ Kraken OHLCV FAILED:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🚀 TESTING REAL CRYPTO DATA SOURCES');
  console.log('═══════════════════════════════════════════════════');

  const results = {
    kraken: await testKraken(),
    coincap: await testCoinCap(),
    coingecko: await testCoinGecko(),
    coinpaprika: await testCoinPaprika(),
    binance: await testBinance(),
    krakenOHLCV: await testKrakenOHLCV()
  };

  console.log('\n═══════════════════════════════════════════════════');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════');

  const successCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;

  console.log(`\nWorking APIs: ${successCount}/${totalCount}`);
  Object.entries(results).forEach(([name, success]) => {
    console.log(`  ${success ? '✅' : '❌'} ${name}`);
  });

  if (successCount > 0) {
    console.log('\n✅ SUCCESS! Project has access to REAL market data!');
    console.log(`   ${successCount} working data source(s) available.`);
  } else {
    console.log('\n❌ FAILED! No working data sources found.');
  }

  console.log('\n═══════════════════════════════════════════════════\n');
  process.exit(successCount > 0 ? 0 : 1);
}

runAllTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
