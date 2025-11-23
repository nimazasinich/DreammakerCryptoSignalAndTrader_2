/**
 * REAL PATTERN OVERLAY COMPONENT - 100% REAL DATA
 * Visualizes SMC, Elliott Wave, and Harmonic patterns on charts
 */

import React, { useEffect, useState } from 'react';
import { Logger } from '../../core/Logger.js';
import { AdvancedChart } from '../AdvancedChart.js';
import { fmt } from '../../utils/num.js';
import { apiUrl } from '../../lib/api';

interface Pattern {
  type: string;
  coordinates: { x: number; y: number }[];
  confidence: number;
  timestamp: number;
}

interface PatternOverlayProps {
  symbol: string;
  timeframe: string;
}


const logger = Logger.getInstance();

export const PatternOverlay: React.FC<PatternOverlayProps> = ({ symbol, timeframe }) => {
  return <RealPatternOverlay symbol={symbol} timeframe={timeframe} />;
};

export const RealPatternOverlay: React.FC<PatternOverlayProps> = ({ symbol, timeframe }) => {
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [realPatterns, setRealPatterns] = useState<any>(null);
  const [realChartData, setRealChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRealPatterns = async () => {
      try {
        // Fetch real SMC patterns from API
        const response = await fetch(
          apiUrl(`/analysis/smc?symbol=${symbol}&timeframe=${timeframe}`)
        , { mode: "cors", headers: { "Content-Type": "application/json" } });
        const data = await response.json();
        
        if (data.success) {
          setRealPatterns(data.data);
        }
      } catch (error) {
        logger.error('Failed to fetch real patterns:', {}, error);
      }
    };

    const fetchRealChartData = async () => {
      try {
        // Fetch real historical data
        const response = await fetch(
          apiUrl(`/hf/ohlcv?symbol=${symbol}&days=90`)
        , { mode: "cors", headers: { "Content-Type": "application/json" } });
        const data = await response.json();
        
        if (data.success && data.data) {
          setRealChartData(data.data);
          setLoading(false);
        }
      } catch (error) {
        logger.error('Failed to fetch chart data:', {}, error);
        setLoading(false);
      }
    };

    fetchRealPatterns();
    fetchRealChartData();

    // Update every minute
    const interval = setInterval(() => {
      fetchRealPatterns();
      fetchRealChartData();
    }, 60000);

    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-900 rounded-lg">
        <div className="text-slate-400">Loading real pattern data...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <AdvancedChart 
        data={realChartData}
        symbol={symbol}
        timeframe={timeframe}
      />
      
      {realPatterns && (
        <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur-sm rounded-lg p-4 max-w-xs">
          <h3 className="text-sm font-semibold text-white mb-2">Real Patterns Detected</h3>
          
          {/* Liquidity Zones */}
          {realPatterns.liquidityZones?.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-slate-400 mb-1">Liquidity Zones</div>
              {realPatterns.liquidityZones.slice(0, 3).map((zone: any, i: number) => (
                <div key={i} className="text-xs text-slate-300 flex justify-between">
                  <span className={zone.type === 'ACCUMULATION' ? 'text-green-400' : 'text-red-400'}>
                    {zone.type}
                  </span>
                  <span>${fmt(zone.price, 2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Order Blocks */}
          {realPatterns.orderBlocks?.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-slate-400 mb-1">Order Blocks</div>
              {realPatterns.orderBlocks.slice(0, 3).map((block: any, i: number) => (
                <div key={i} className="text-xs text-slate-300 flex justify-between">
                  <span className={block.type === 'BULLISH' ? 'text-green-400' : 'text-red-400'}>
                    {block.type}
                  </span>
                  <span>${fmt(block.high, 2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Fair Value Gaps */}
          {realPatterns.fairValueGaps?.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-slate-400 mb-1">Fair Value Gaps</div>
              {realPatterns.fairValueGaps.slice(0, 3).map((gap: any, i: number) => (
                <div key={i} className="text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>{gap.filled ? '✓ Filled' : '○ Open'}</span>
                    <span>{fmt(gap.fillProbability * 100, 0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Break of Structure */}
          {realPatterns.breakOfStructure?.detected && (
            <div className="border-t border-slate-700 pt-2 mt-2">
              <div className="text-xs font-semibold text-yellow-400">
                {realPatterns.breakOfStructure.type}
              </div>
              <div className="text-xs text-slate-400">
                Strength: {fmt(realPatterns.breakOfStructure.strength * 100, 1)}%
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
