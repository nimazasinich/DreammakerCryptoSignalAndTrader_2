import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Logger } from '../core/Logger.js';
import { Shield, AlertTriangle, TrendingDown, Activity, Target, BarChart3 } from 'lucide-react';
import { TradingDashboard } from '../components/trading/TradingDashboard';
import { Portfolio } from '../components/portfolio/Portfolio';
import { RealPortfolioConnector } from '../components/connectors/RealPortfolioConnector';
import { useTheme } from '../components/Theme/ThemeProvider';
import { dataManager } from '../services/dataManager';
import { useLiveData } from '../components/LiveDataContext';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import ResponseHandler from '../components/ui/ResponseHandler';
import { USE_MOCK_DATA } from '../config/env.js';

interface RiskMetrics {
  valueAtRisk: number;
  maxDrawdown: number;
  sharpeRatio: number;
  alerts: Array<{
    type: string;
    title: string;
    description: string;
    severity: string;
  }>;
  stressTests: Array<{
    scenario: string;
    impact: number;
  }>;
}


const logger = Logger.getInstance();

export const RiskView: React.FC = () => {
  const themeContext = useTheme();
  const liveDataContext = useLiveData();

  if (!liveDataContext) {
    return <div>Loading...</div>;
  }

  const { subscribeToSignals } = liveDataContext;
  
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>({
    valueAtRisk: -2450,
    maxDrawdown: -12.3,
    sharpeRatio: 1.45,
    alerts: [
      {
        type: 'warning',
        title: 'High Correlation',
        description: 'BTC and ETH correlation at 0.89',
        severity: 'medium'
      },
      {
        type: 'danger',
        title: 'Position Size',
        description: 'BTC position exceeds 25% limit',
        severity: 'high'
      }
    ],
    stressTests: [
      { scenario: '2008 Crisis Scenario', impact: -34.2 },
      { scenario: 'COVID-19 Crash', impact: -28.7 },
      { scenario: 'Flash Crash', impact: -15.3 }
    ]
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch risk metrics data
  useEffect(() => {
    const fetchRiskData = async () => {
      try {
        setLoading(true);
        const response = await dataManager.fetchData('/api/risk/metrics') as any;
        if (response && response.success) {
          setRiskMetrics(response.data as RiskMetrics);
          setError(null);
        } else {
          setError(new Error('No risk metrics data available'));
          console.error('No risk metrics data available');
        }
      } catch (err) {
        logger.error('Error fetching risk data:', {}, err);
        setError(err instanceof Error ? err : new Error('Failed to load risk metrics'));
      } finally {
        setLoading(false);
      }
    };

    fetchRiskData();

    // Set up interval for refreshing data
    const intervalId = setInterval(fetchRiskData, 60000); // Refresh every minute

    // Subscribe to real-time risk updates
    const unsubscribe = subscribeToSignals(['BTCUSDT'], (data: any) => {
      if (data && data.type === 'risk-update') {
        setRiskMetrics(prevMetrics => ({
          ...prevMetrics,
          ...data.metrics
        }));
      }
    });

    // Cleanup
    return () => {
      clearInterval(intervalId);
      unsubscribe();
    };
  }, [subscribeToSignals]);

  return (
    <ErrorBoundary>
      <ResponseHandler isLoading={loading} error={error} data={riskMetrics}>
        {(data) => (
          <div className="w-full min-h-screen p-8 animate-fade-in">
          <style>{`
            @keyframes glow-pulse {
              0%, 100% { opacity: 0.5; }
              50% { opacity: 1; }
            }
            .animate-glow-pulse {
              animation: glow-pulse 2s ease-in-out infinite;
            }
          `}</style>

          {/* Header */}
          <div className="mb-8">
            <h1 
              className="text-4xl font-bold mb-3 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent"
              style={{ textShadow: '0 0 30px rgba(251, 146, 60, 0.4)' }}
            >
              Risk Management Center
            </h1>
            <p className="text-slate-400 text-base">
              Advanced risk analytics with position sizing and portfolio optimization
            </p>
          </div>
          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* Portfolio Risk Card */}
            <div 
              className="group relative rounded-2xl p-6 backdrop-blur-sm overflow-hidden transition-all duration-500 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(16, 185, 129, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.08)'
              }}
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              
              {/* Glow effect on hover */}
              <div 
                className="absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl"
                style={{
                  background: 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
                  zIndex: -1
                }}
              />

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div 
                    className="p-3 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.25) 100%)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3), 0 0 40px rgba(5, 150, 105, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    <Shield 
                      className="w-5 h-5 text-emerald-400" 
                      style={{ filter: 'drop-shadow(0 0 12px rgba(52, 211, 153, 0.8))' }}
                    />
                  </div>
                  <h3 className="text-xl font-bold text-emerald-400">Portfolio Risk</h3>
                </div>
                
                {/* Value at Risk */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400 text-sm">Value at Risk (95%)</span>
                    <span className="text-red-400 font-mono">${data.valueAtRisk}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 to-red-400 animate-glow-pulse"
                      style={{ width: `${Math.min(100, Math.abs(data.valueAtRisk) / 50)}%` }}
                    />
                  </div>
                </div>
                
                {/* Max Drawdown */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400 text-sm">Max Drawdown</span>
                    <span className="text-red-400 font-mono">{data.maxDrawdown}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 to-amber-400"
                      style={{ width: `${Math.min(100, Math.abs(data.maxDrawdown) * 3)}%` }}
                    />
                  </div>
                </div>
                
                {/* Sharpe Ratio */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400 text-sm">Sharpe Ratio</span>
                    <span className="text-emerald-400 font-mono">{data.sharpeRatio}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                      style={{ width: `${Math.min(100, data.sharpeRatio * 30)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Risk Alerts Card */}
            <div 
              className="group relative rounded-2xl p-6 backdrop-blur-sm overflow-hidden transition-all duration-500 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(239, 68, 68, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.08)'
              }}
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-orange-500/5 to-amber-500/10" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              
              {/* Glow effect on hover */}
              <div 
                className="absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl"
                style={{
                  background: 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.2) 0%, transparent 70%)',
                  zIndex: -1
                }}
              />

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div 
                    className="p-3 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.25) 100%)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      boxShadow: '0 8px 24px rgba(239, 68, 68, 0.3), 0 0 40px rgba(220, 38, 38, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    <AlertTriangle 
                      className="w-5 h-5 text-red-400" 
                      style={{ filter: 'drop-shadow(0 0 12px rgba(248, 113, 113, 0.8))' }}
                    />
                  </div>
                  <h3 className="text-xl font-bold text-red-400">Risk Alerts</h3>
                </div>
                
                {/* Alerts List */}
                <div className="space-y-4">
                  {(data.alerts || []).map((alert, index) => (
                    <div 
                      key={`alert-${alert.type}-${alert.title}-${index}`}
                      className="p-4 rounded-xl"
                      style={{
                        background: alert.severity === 'high' 
                          ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%)'
                          : alert.severity === 'medium'
                            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%)'
                            : 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)',
                        border: alert.severity === 'high'
                          ? '1px solid rgba(220, 38, 38, 0.3)'
                          : alert.severity === 'medium'
                            ? '1px solid rgba(245, 158, 11, 0.3)'
                            : '1px solid rgba(59, 130, 246, 0.3)',
                      }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div 
                          className={`w-3 h-3 rounded-full ${
                            alert.severity === 'high' 
                              ? 'bg-red-500 animate-glow-pulse' 
                              : alert.severity === 'medium'
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                          }`}
                          style={{
                            boxShadow: alert.severity === 'high'
                              ? '0 0 12px rgba(239, 68, 68, 0.8)'
                              : alert.severity === 'medium'
                                ? '0 0 12px rgba(245, 158, 11, 0.8)'
                                : '0 0 12px rgba(59, 130, 246, 0.8)'
                          }}
                        />
                        <h4 className={`font-bold ${
                          alert.severity === 'high' 
                            ? 'text-red-400' 
                            : alert.severity === 'medium'
                              ? 'text-amber-400'
                              : 'text-blue-400'
                        }`}>
                          {alert.title}
                        </h4>
                      </div>
                      <p className="text-slate-400 text-sm pl-6">{alert.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Stress Tests Card */}
            <div 
              className="group relative rounded-2xl p-6 backdrop-blur-sm overflow-hidden transition-all duration-500 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
                border: '1px solid rgba(124, 58, 237, 0.2)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(124, 58, 237, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.08)'
              }}
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-violet-500/5 to-indigo-500/10" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              
              {/* Glow effect on hover */}
              <div 
                className="absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl"
                style={{
                  background: 'radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.2) 0%, transparent 70%)',
                  zIndex: -1
                }}
              />

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div 
                    className="p-3 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.25) 0%, rgba(109, 40, 217, 0.25) 100%)',
                      border: '1px solid rgba(124, 58, 237, 0.4)',
                      boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3), 0 0 40px rgba(109, 40, 217, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    <TrendingDown 
                      className="w-5 h-5 text-violet-400" 
                      style={{ filter: 'drop-shadow(0 0 12px rgba(167, 139, 250, 0.8))' }}
                    />
                  </div>
                  <h3 className="text-xl font-bold text-violet-400">Stress Tests</h3>
                </div>
                
                {/* Stress Tests List */}
                <div className="space-y-4">
                  {(data.stressTests || []).map((test, index) => (
                    <div key={`stress-test-${test.scenario}-${index}`} className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-400 text-sm">{test.scenario}</span>
                        <span className="text-red-400 font-mono">{test.impact}%</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-red-500 to-violet-500"
                          style={{ width: `${Math.min(100, Math.abs(test.impact) * 1.5)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
        </div>
      </div>
        )}
      </ResponseHandler>
    </ErrorBoundary>
  );
};

export default RiskView;
