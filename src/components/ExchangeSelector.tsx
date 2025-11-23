import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import axios from 'axios';
import { Logger } from '../core/Logger.js';
import { API_BASE } from '../config/env.js';

const logger = Logger.getInstance();

export const ExchangeSelector: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentExchange, setCurrentExchange] = useState<'binance' | 'kucoin'>('binance');
  const [loading, setLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  useEffect(() => {
    fetchHealthStatus();
  }, []);

  const fetchHealthStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/health`);
      setHealthStatus(response.data);
      logger.info('Health status fetched', { exchanges: response.data.services });
    } catch (error) {
      logger.error('Failed to fetch health status', {}, error as Error);
    }
  };

  const switchExchange = async (exchange: 'binance' | 'kucoin') => {
    setLoading(true);
    try {
      // Here you would call an API endpoint to switch the exchange
      // For now, we'll just update the local state
      setCurrentExchange(exchange);
      logger.info(`Switched to ${exchange} exchange`);
      
      // Refresh health status after switch
      await fetchHealthStatus();
    } catch (error) {
      logger.error('Failed to switch exchange', {}, error as Error);
    } finally {
      setLoading(false);
    }
  };

  const getExchangeStatus = (exchangeName: 'binance' | 'kucoin') => {
    if (!healthStatus?.services) return 'unknown';
    const service = healthStatus.services[exchangeName];
    return service?.connected ? 'connected' : 'disconnected';
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-bold text-white">Exchange</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => switchExchange('binance')}
          disabled={loading}
          className={`px-4 py-3 rounded-lg font-semibold transition-all ${
            currentExchange === 'binance'
              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg shadow-yellow-500/50'
              : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex flex-col items-center gap-1">
            <span>Binance</span>
            <span className="text-xs opacity-75">
              {getExchangeStatus('binance') === 'connected' ? '🟢 Connected' : '🔴 Offline'}
            </span>
          </div>
        </button>

        <button
          onClick={() => switchExchange('kucoin')}
          disabled={loading}
          className={`px-4 py-3 rounded-lg font-semibold transition-all ${
            currentExchange === 'kucoin'
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50'
              : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex-col items-center gap-1">
            <span>KuCoin</span>
            <span className="text-xs opacity-75">
              {getExchangeStatus('kucoin') === 'connected' ? '🟢 Connected' : '🔴 Offline'}
            </span>
          </div>
        </button>
      </div>

      {healthStatus && (
        <div className="mt-4 p-3 bg-slate-900/50 rounded-lg text-xs">
          <div className="grid grid-cols-2 gap-2 text-slate-400">
            <div>
              <span className="text-yellow-400">Binance:</span>
              <div className="mt-1 text-white">
                Latency: {healthStatus.services?.binance?.connectionHealth?.latency || 'N/A'}ms
              </div>
            </div>
            <div>
              <span className="text-green-400">KuCoin:</span>
              <div className="mt-1 text-white">
                Latency: {healthStatus.services?.kucoin?.connectionHealth?.latency || 'N/A'}ms
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExchangeSelector;

