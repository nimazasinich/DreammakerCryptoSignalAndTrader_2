import React, { useState, useEffect } from 'react';
import { Logger } from '../../core/Logger.js';
import { PortfolioPosition, MarketData } from '../../types';
import { API_BASE } from '../../config/env';
import { Wallet, TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';

interface PortfolioProps {
  marketData: MarketData[];
}


const logger = Logger.getInstance();

export const Portfolio: React.FC<PortfolioProps> = ({ marketData }) => {
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0);
  const [totalPnLPercent, setTotalPnLPercent] = useState(0);

  // Fetch real portfolio data from API
  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const response = await fetch(`${API_BASE}/portfolio`, { credentials: 'include' });
        if (!response.ok) {
          console.error('Failed to fetch portfolio');
        }
        
        const data = await response.json();
        
        if (data.success && data.portfolio) {
          // Convert portfolio response to positions format
          const portfolioPositions: PortfolioPosition[] = 
            data.portfolio.positions?.map((pos: any) => ({
              symbol: pos.symbol || pos.asset || '',
              quantity: pos.quantity || pos.amount || 0,
              averagePrice: pos.averagePrice || pos.entryPrice || 0,
              currentPrice: pos.currentPrice || pos.marketPrice || 
                           marketData.find(m => m.symbol === pos.symbol)?.price || 0,
              pnl: pos.pnl || pos.unrealizedPnL || 0,
              pnlPercent: pos.pnlPercent || pos.unrealizedPnLPercent || 0,
              allocation: pos.allocation || 0
            })) || [];

          // Calculate total values
          const total = data.portfolio.totalValue || portfolioPositions.reduce(
            (sum, pos) => sum + (pos.quantity * pos.currentPrice), 0
          );
          
          const totalCostBasis = portfolioPositions.reduce(
            (sum, pos) => sum + (pos.quantity * pos.averagePrice), 0
          );
          const totalPnLValue = total - totalCostBasis;
          const totalPnLPercentValue = totalCostBasis > 0 
            ? (totalPnLValue / totalCostBasis) * 100 
            : 0;

          // Recalculate allocations if needed
          const finalPositions = (portfolioPositions || []).map(position => ({
            ...position,
            allocation: total > 0 
              ? (position.quantity * position.currentPrice / total) * 100 
              : 0
          }));

          setPositions(finalPositions);
          setTotalValue(total);
          setTotalPnL(totalPnLValue);
          setTotalPnLPercent(totalPnLPercentValue);
        } else {
          // No positions - show empty portfolio
          setPositions([]);
          setTotalValue(0);
          setTotalPnL(0);
          setTotalPnLPercent(0);
        }
      } catch (error) {
        logger.error('Failed to fetch portfolio data:', {}, error);
        // Show empty state on error instead of mock data
        setPositions([]);
        setTotalValue(0);
        setTotalPnL(0);
        setTotalPnLPercent(0);
      }
    };

    fetchPortfolio();
    // Refresh portfolio data periodically
    const interval = setInterval(fetchPortfolio, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [marketData]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Wallet className="text-green-400" size={28} />
        <h3 className="text-xl font-bold text-white">Portfolio</h3>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <DollarSign size={16} className="text-blue-400" />
            <span className="text-gray-400 text-sm">Total Value</span>
          </div>
          <div className="text-white font-bold text-xl">
            ${totalValue.toLocaleString()}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            {totalPnL >= 0 ? (
              <TrendingUp size={16} className="text-green-400" />
            ) : (
              <TrendingDown size={16} className="text-red-400" />
            )}
            <span className="text-gray-400 text-sm">Total P&L</span>
          </div>
          <div className={`font-bold text-xl ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString()}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <PieChart size={16} className="text-purple-400" />
            <span className="text-gray-400 text-sm">Return %</span>
          </div>
          <div className={`font-bold text-xl ${totalPnLPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-white">Positions</h4>
        
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left p-3 text-gray-300 text-sm">Asset</th>
                <th className="text-right p-3 text-gray-300 text-sm">Quantity</th>
                <th className="text-right p-3 text-gray-300 text-sm">Avg Price</th>
                <th className="text-right p-3 text-gray-300 text-sm">Current</th>
                <th className="text-right p-3 text-gray-300 text-sm">P&L</th>
                <th className="text-right p-3 text-gray-300 text-sm">Allocation</th>
              </tr>
            </thead>
            <tbody>
              {(positions || []).map((position, index) => (
                <tr key={position.symbol} className={index % 2 === 0 ? 'bg-gray-750' : 'bg-gray-800'}>
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        position.symbol === 'BTC' ? 'bg-orange-600' :
                        position.symbol === 'ETH' ? 'bg-blue-600' :
                        position.symbol === 'SOL' ? 'bg-purple-600' : 'bg-gray-600'
                      }`}>
                        {position.symbol.slice(0, 2)}
                      </div>
                      <span className="text-white font-medium">{position.symbol}</span>
                    </div>
                  </td>
                  <td className="text-right p-3 text-white">
                    {position.quantity.toFixed(4)}
                  </td>
                  <td className="text-right p-3 text-gray-300">
                    ${position.averagePrice.toLocaleString()}
                  </td>
                  <td className="text-right p-3 text-white font-medium">
                    ${position.currentPrice.toLocaleString()}
                  </td>
                  <td className={`text-right p-3 font-medium ${
                    position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    <div>{position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(0)}</div>
                    <div className="text-xs">
                      {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                    </div>
                  </td>
                  <td className="text-right p-3">
                    <div className="flex items-center justify-end space-x-2">
                      <span className="text-gray-300">{position.allocation.toFixed(1)}%</span>
                      <div className="w-12 bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-blue-400 h-2 rounded-full"
                          style={{ width: `${position.allocation}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portfolio Allocation Chart */}
      <div className="mt-6">
        <h4 className="text-lg font-semibold text-white mb-3">Allocation</h4>
        <div className="flex rounded-lg overflow-hidden h-4">
          {(positions || []).map((position, index) => {
            const colors = ['bg-orange-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500'];
            return (
              <div
                key={position.symbol}
                className={colors[index % colors.length]}
                style={{ width: `${position.allocation}%` }}
                title={`${position.symbol}: ${position.allocation.toFixed(1)}%`}
              ></div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-3">
          {(positions || []).map((position, index) => {
            const colors = ['bg-orange-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500'];
            return (
              <div key={position.symbol} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
                <span className="text-gray-300 text-sm">
                  {position.symbol} ({position.allocation.toFixed(1)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};