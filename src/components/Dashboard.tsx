import React, { useState, useEffect } from 'react';
import { Logger } from '../core/Logger.js';
import { PriceChart } from './market/PriceChart';
import TopSignalsPanel from './TopSignalsPanel';
import { Signal } from './TopSignalsPanel';
import { realDataManager } from '../services/RealDataManager';

const logger = Logger.getInstance();

const Dashboard: React.FC = () => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [neuralNetworkAccuracy, setNeuralNetworkAccuracy] = useState(85);

  useEffect(() => {
    // Fetch signals from RealDataManager
    const fetchSignals = async () => {
      try {
        const signalsData = await realDataManager.getAISignals(10);
        setSignals(signalsData);
        
        // Calculate accuracy based on signals
        if ((signalsData?.length || 0) > 0) {
          const avgConfidence = signalsData.reduce((sum, s) => sum + s.confidence, 0) / signalsData.length;
          setNeuralNetworkAccuracy(Math.round(avgConfidence));
        }
      } catch (err) {
        logger.error('Failed to fetch signals:', {}, err as Error);
      }
    };

    fetchSignals();

    // Refresh every 30 seconds
    const interval = setInterval(fetchSignals, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol.replace('/USDT', ''));
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Crypto AI Trading Dashboard
          </h1>
          <p className="text-gray-400">
            Real-time market analysis and AI-powered trading signals
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Price Chart & Signals */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Price Chart */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-white mb-4">
                  Price Chart
                </h2>
                <div className="flex gap-2 mb-4">
                  {['BTC', 'ETH', 'SOL', 'ADA'].map((symbol) => (
                    <button
                      type="button"
                      key={symbol}
                      onClick={() => handleSymbolChange(symbol)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedSymbol === symbol
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {symbol}/USDT
                    </button>
                  ))}
                </div>
              </div>
              <PriceChart 
                symbol={selectedSymbol}
                autoFetch={true}
                initialTimeframe="1h"
              />
            </div>

            {/* 📍 EXACT LOCATION: Top Signals Panel below Price Chart */}
            <TopSignalsPanel 
              signals={signals}
              neuralNetworkAccuracy={neuralNetworkAccuracy}
              className="w-full"
            />

          </div>

          {/* Right Column - Other Widgets */}
          <div className="space-y-6">
            
            {/* Portfolio Summary */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h3 className="text-lg font-bold text-white mb-4">Portfolio Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Value</span>
                  <span className="text-white font-bold">$125,430.50</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">24h Change</span>
                  <span className="text-green-400 font-bold">+2.34%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total P&L</span>
                  <span className="text-green-400 font-bold">+$12,430.50</span>
                </div>
              </div>
            </div>

            {/* Market Sentiment */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h3 className="text-lg font-bold text-white mb-4">Market Sentiment</h3>
              <div className="text-center">
                <div className="text-5xl font-bold text-green-400 mb-2">72</div>
                <div className="text-sm text-gray-400 mb-4">Greed</div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: '72%' }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h3 className="text-lg font-bold text-white mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Active Positions</span>
                  <span className="text-white font-bold">8</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Win Rate</span>
                  <span className="text-green-400 font-bold">68%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Avg. Trade</span>
                  <span className="text-white font-bold">$1,234</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

