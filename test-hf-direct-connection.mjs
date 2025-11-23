#!/usr/bin/env node

/**
 * HuggingFace Direct Connection Test Suite
 * Tests all new HF endpoints and validates the integration
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:8001';
const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

let passedTests = 0;
let failedTests = 0;
const results = [];

function log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logTest(name, passed, details) {
    const symbol = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`${symbol} ${name}`, color);
    if (details) {
        log(`   ${details}`, 'cyan');
    }
    results.push({ name, passed, details });
    if (passed) passedTests++;
    else failedTests++;
}

async function testEndpoint(name, url, options = {}) {
    try {
        const startTime = Date.now();
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        const latency = Date.now() - startTime;
        const data = await response.json();

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${data.error || data.message}`);
        }

        return { success: true, data, latency, status: response.status };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function runTests() {
    log('\n🚀 HuggingFace Direct Connection Test Suite\n', 'blue');
    log(`API Base: ${API_BASE}\n`, 'cyan');

    // Test 1: HF Status Endpoint
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('Test 1: HF Status Endpoint', 'yellow');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

    const statusResult = await testEndpoint(
        'GET /api/hf/status',
        `${API_BASE}/api/hf/status`
    );

    if (statusResult.success) {
        const { connected, tokenValid, latency } = statusResult.data;
        logTest(
            'HF Status Check',
            connected && tokenValid,
            `Connected: ${connected}, Token Valid: ${tokenValid}, Latency: ${latency}ms`
        );

        if (!connected || !tokenValid) {
            log(`   ⚠️  Warning: HuggingFace connection issues detected`, 'yellow');
            if (!tokenValid) {
                log(`   🔐 Token is invalid - update HF_TOKEN in .env`, 'yellow');
            }
        }
    } else {
        logTest('HF Status Check', false, statusResult.error);
    }

    // Test 2: HF Validation Endpoint
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('Test 2: HF Validation Endpoint (Force Check)', 'yellow');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

    const validateResult = await testEndpoint(
        'GET /api/hf/validate',
        `${API_BASE}/api/hf/validate`
    );

    if (validateResult.success) {
        const { connected, tokenValid, latency, message } = validateResult.data;
        logTest(
            'HF Validation',
            connected && tokenValid && latency < 5000,
            `${message} (${latency}ms)`
        );
    } else {
        logTest('HF Validation', false, validateResult.error);
    }

    // Test 3: Market Prices Endpoint
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('Test 3: Market Prices (HuggingFace First)', 'yellow');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

    const pricesResult = await testEndpoint(
        'GET /api/market/prices',
        `${API_BASE}/api/market/prices?symbols=BTC,ETH,BNB`
    );

    if (pricesResult.success) {
        const { data, source, count } = pricesResult.data;
        const fromHF = source === 'hf_engine' || source === 'huggingface';
        logTest(
            'Market Prices',
            data && data.length >= 3,
            `Source: ${source}, Count: ${count}, From HF: ${fromHF}`
        );

        if (!fromHF) {
            log(`   ⚠️  Warning: Using fallback source (${source})`, 'yellow');
        }
    } else {
        logTest('Market Prices', false, pricesResult.error);
    }

    // Test 4: Top Coins Endpoint
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('Test 4: Top Coins Endpoint', 'yellow');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

    const topCoinsResult = await testEndpoint(
        'GET /api/coins/top',
        `${API_BASE}/api/coins/top?limit=5`
    );

    if (topCoinsResult.success) {
        const { data, source, count } = topCoinsResult.data;
        logTest(
            'Top Coins',
            data && data.length >= 3,
            `Retrieved ${count} coins from ${source}`
        );
    } else {
        logTest('Top Coins', false, topCoinsResult.error);
    }

    // Test 5: Market Overview Endpoint
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('Test 5: Market Overview', 'yellow');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

    const overviewResult = await testEndpoint(
        'GET /api/market/overview',
        `${API_BASE}/api/market/overview`
    );

    if (overviewResult.success) {
        const { data } = overviewResult.data;
        const hasData = data && (data.totalMarketCap || data.btcDominance);
        logTest(
            'Market Overview',
            hasData,
            `Source: ${data.source || 'unknown'}`
        );
    } else {
        logTest('Market Overview', false, overviewResult.error);
    }

    // Test 6: Sentiment Analysis Endpoint
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('Test 6: Sentiment Analysis', 'yellow');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

    const sentimentResult = await testEndpoint(
        'POST /api/sentiment/analyze',
        `${API_BASE}/api/sentiment/analyze`,
        {
            method: 'POST',
            body: JSON.stringify({ text: 'Bitcoin is looking very bullish today!' })
        }
    );

    if (sentimentResult.success) {
        const { data } = sentimentResult.data;
        const hasSentiment = data && (data.label || data.sentiment);
        logTest(
            'Sentiment Analysis',
            hasSentiment,
            `Result: ${data.label || data.sentiment} (Score: ${data.score})`
        );
    } else {
        logTest('Sentiment Analysis', false, sentimentResult.error);
    }

    // Print Summary
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('Test Summary', 'blue');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

    const total = passedTests + failedTests;
    const percentage = ((passedTests / total) * 100).toFixed(1);

    log(`\n✅ Passed: ${passedTests}/${total}`, 'green');
    log(`❌ Failed: ${failedTests}/${total}`, 'red');
    log(`📊 Success Rate: ${percentage}%\n`, percentage >= 80 ? 'green' : 'yellow');

    if (percentage >= 80) {
        log('🎉 All critical tests passed! HuggingFace integration is working.', 'green');
    } else if (percentage >= 50) {
        log('⚠️  Some tests failed. Check the logs above for details.', 'yellow');
    } else {
        log('❌ Multiple tests failed. Please check your configuration.', 'red');
    }

    log('');
    process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    process.exit(1);
});
