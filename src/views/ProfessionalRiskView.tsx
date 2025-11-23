import React, { useState, useEffect } from 'react';
import { Shield, Activity, TrendingDown, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import { RiskGauge } from '../components/risk/RiskGauge';
import { LiquidationBar } from '../components/risk/LiquidationBar';
import { StressTestCard } from '../components/risk/StressTestCard';
import { RiskAlertCard } from '../components/risk/RiskAlertCard';
import { Logger } from '../core/Logger.js';
import { API_BASE } from '../config/env';

const logger = Logger.getInstance();

interface ProfessionalRiskMetrics {
  totalLiquidationRisk: number;
  aggregateLeverage: number;
  marginUtilization: number;
  marketDepthRisk: number;
  volatilityRisk: number;
  fundingRateRisk: number;
  concentrationRisk: number;
  correlationRisk: number;
  portfolioVaR: number;
  maxDrawdown: number;
  sharpeRatio: number;
  positions: any[];
  alerts: any[];
  alertCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  stressTests: any[];
  totalValue: number;
  totalPositions: number;
  leveragedPositions: number;
  positionsAtRisk: number;
}

export const ProfessionalRiskView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<ProfessionalRiskMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const fetchRiskMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/professional-risk/metrics`, { mode: "cors", headers: { "Content-Type": "application/json" } });

      if (!response.ok) {
        logger.error('Failed to fetch risk metrics', { status: response.status, statusText: response.statusText });
        // Don't throw, just set empty metrics to show UI
        setMetrics({
          totalLiquidationRisk: 0,
          aggregateLeverage: 0,
          marginUtilization: 0,
          marketDepthRisk: 0,
          volatilityRisk: 0,
          fundingRateRisk: 0,
          concentrationRisk: 0,
          correlationRisk: 0,
          portfolioVaR: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          positions: [],
          alerts: [],
          alertCounts: { critical: 0, high: 0, medium: 0, low: 0 },
          stressTests: [],
          totalValue: 0,
          totalPositions: 0,
          leveragedPositions: 0,
          positionsAtRisk: 0
        });
        setLastUpdate(Date.now());
        return;
      }

      const data = await response.json();

      if (!data.success) {
        logger.error('Failed to fetch risk metrics', { error: data.error });
        // Still set empty metrics to show UI
        setMetrics({
          totalLiquidationRisk: 0,
          aggregateLeverage: 0,
          marginUtilization: 0,
          marketDepthRisk: 0,
          volatilityRisk: 0,
          fundingRateRisk: 0,
          concentrationRisk: 0,
          correlationRisk: 0,
          portfolioVaR: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          positions: [],
          alerts: [],
          alertCounts: { critical: 0, high: 0, medium: 0, low: 0 },
          stressTests: [],
          totalValue: 0,
          totalPositions: 0,
          leveragedPositions: 0,
          positionsAtRisk: 0
        });
        setLastUpdate(Date.now());
        return;
      }

      setMetrics(data.metrics || {
        totalLiquidationRisk: 0,
        aggregateLeverage: 0,
        marginUtilization: 0,
        marketDepthRisk: 0,
        volatilityRisk: 0,
        fundingRateRisk: 0,
        concentrationRisk: 0,
        correlationRisk: 0,
        portfolioVaR: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        positions: [],
        alerts: [],
        alertCounts: { critical: 0, high: 0, medium: 0, low: 0 },
        stressTests: [],
        totalValue: 0,
        totalPositions: 0,
        leveragedPositions: 0,
        positionsAtRisk: 0
      });
      setLastUpdate(Date.now());
      logger.info('Risk metrics updated successfully');
    } catch (err: any) {
      logger.error('Failed to fetch risk metrics', {}, err);
      // Set empty metrics instead of error to show UI
      setMetrics({
        totalLiquidationRisk: 0,
        aggregateLeverage: 0,
        marginUtilization: 0,
        marketDepthRisk: 0,
        volatilityRisk: 0,
        fundingRateRisk: 0,
        concentrationRisk: 0,
        correlationRisk: 0,
        portfolioVaR: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        positions: [],
        alerts: [],
        alertCounts: { critical: 0, high: 0, medium: 0, low: 0 },
        stressTests: [],
        totalValue: 0,
        totalPositions: 0,
        leveragedPositions: 0,
        positionsAtRisk: 0
      });
      setLastUpdate(Date.now());
      setError(null); // Clear error to show UI with empty data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskMetrics();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchRiskMetrics, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-xl text-gray-300">Loading risk analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading Risk Data</h2>
          <p className="text-gray-400 mb-6">{error || 'No portfolio data available'}</p>
          <button
            onClick={fetchRiskMetrics}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate overall risk score (0-100)
  const overallRiskScore = Math.round(
    (metrics.totalLiquidationRisk * 0.3 +
      (metrics.aggregateLeverage / 10) * 100 * 0.2 +
      metrics.marginUtilization * 0.15 +
      metrics.concentrationRisk * 0.15 +
      metrics.volatilityRisk * 0.1 +
      metrics.marketDepthRisk * 0.1) /
      1
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4 md:p-8">
      <style>{`
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .animate-glow-pulse {
          animation: glow-pulse 2s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              Professional Risk Management
            </h1>
            <p className="text-gray-400 text-lg">
              Real-time crypto risk analysis with liquidation monitoring
            </p>
          </div>

          <button
            onClick={fetchRiskMetrics}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Last update */}
        <p className="text-sm text-gray-500">
          Last updated: {new Date(lastUpdate).toLocaleTimeString()}
        </p>
      </div>

      {/* Critical Alerts Banner */}
      {metrics.alertCounts.critical > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-950/80 to-red-900/60 border border-red-500 rounded-xl animate-pulse">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <div>
              <p className="text-lg font-bold text-red-400">
                {metrics.alertCounts.critical} CRITICAL ALERT{metrics.alertCounts.critical > 1 ? 'S' : ''}
              </p>
              <p className="text-sm text-red-300">Immediate action required - liquidation risk detected</p>
            </div>
          </div>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Portfolio Value */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-blue-950/60 to-blue-900/40 border border-blue-500/50">
          <p className="text-sm text-gray-400 mb-1">Portfolio Value</p>
          <p className="text-3xl font-bold text-white">
            ${metrics.totalValue.toLocaleString()}
          </p>
          <p className="text-xs text-blue-400 mt-2">
            {metrics.totalPositions} positions • {metrics.leveragedPositions} leveraged
          </p>
        </div>

        {/* Risk Score */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-red-950/60 to-red-900/40 border border-red-500/50">
          <p className="text-sm text-gray-400 mb-1">Overall Risk Score</p>
          <p className={`text-3xl font-bold ${
            overallRiskScore > 70 ? 'text-red-400' :
            overallRiskScore > 40 ? 'text-yellow-400' : 'text-green-400'
          }`}>
            {overallRiskScore}/100
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {metrics.positionsAtRisk} positions at risk
          </p>
        </div>

        {/* Leverage */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-orange-950/60 to-orange-900/40 border border-orange-500/50">
          <p className="text-sm text-gray-400 mb-1">Aggregate Leverage</p>
          <p className="text-3xl font-bold text-orange-400">
            {metrics.aggregateLeverage.toFixed(1)}x
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Margin: {metrics.marginUtilization.toFixed(1)}%
          </p>
        </div>

        {/* VaR */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-purple-950/60 to-purple-900/40 border border-purple-500/50">
          <p className="text-sm text-gray-400 mb-1">Value at Risk (95%)</p>
          <p className="text-3xl font-bold text-purple-400">
            ${metrics.portfolioVaR.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Max DD: {metrics.maxDrawdown.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Risk Gauges */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/60 border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
          <Activity className="w-6 h-6 mr-2 text-blue-500" />
          Risk Metrics Dashboard
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <RiskGauge value={metrics.totalLiquidationRisk} label="Liquidation Risk" />
          <RiskGauge value={metrics.concentrationRisk} label="Concentration" />
          <RiskGauge value={metrics.volatilityRisk} label="Volatility" />
          <RiskGauge value={metrics.marketDepthRisk} label="Market Depth" />
          <RiskGauge value={metrics.correlationRisk} label="Correlation" />
          <RiskGauge value={Math.min(100, metrics.aggregateLeverage * 10)} label="Leverage Impact" />
        </div>
      </div>

      {/* Liquidation Monitor */}
      {(metrics.positions?.length || 0) > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
            <TrendingDown className="w-6 h-6 mr-2 text-red-500" />
            Liquidation Monitor
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {metrics.positions
              .filter((p: any) => p.liquidationPrice)
              .sort((a: any, b: any) => b.riskScore - a.riskScore)
              .slice(0, 6)
              .map((pos: any, idx: number) => (
                <LiquidationBar
                  key={idx}
                  symbol={pos.symbol}
                  currentPrice={pos.currentPrice}
                  liquidationPrice={pos.liquidationPrice}
                  side={pos.side}
                  leverage={pos.leverage}
                  distancePercent={parseFloat(pos.liquidationDistance)}
                />
              ))}
          </div>
        </div>
      )}

      {/* Risk Alerts */}
      {(metrics.alerts?.length || 0) > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
            <Shield className="w-6 h-6 mr-2 text-yellow-500" />
            Active Risk Alerts
            <span className="ml-3 px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded-full">
              {metrics.alerts.length}
            </span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {metrics.alerts.slice(0, 6).map((alert: any, idx: number) => (
              <RiskAlertCard key={idx} {...alert} />
            ))}
          </div>
        </div>
      )}

      {/* Stress Tests */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
          <Zap className="w-6 h-6 mr-2 text-purple-500" />
          Real Crypto Market Scenarios
          <span className="ml-3 text-sm text-gray-400 font-normal">
            Based on historical events
          </span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {(metrics.stressTests || []).map((test: any, idx: number) => (
            <StressTestCard key={idx} {...test} />
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 p-4 bg-gray-900/50 border border-gray-700 rounded-xl text-center text-sm text-gray-400">
        <p>
          💡 <strong>Pro Tip:</strong> Keep liquidation distance above 30% and limit leverage to 5x or less for safer trading
        </p>
      </div>
    </div>
  );
};
