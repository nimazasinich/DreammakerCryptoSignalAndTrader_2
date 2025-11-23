// SignalExamplesPanel.tsx - 4 example scenarios display
import React, { useState } from 'react';

interface ExampleSignal {
  id: string;
  type: 'success' | 'failure' | 'hold';
  signal: 'LONG' | 'SHORT' | 'HOLD';
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number[];
  profit?: number;
  loss?: number;
  stages: {
    stage3: number;
    stage4: string;
    stage5: number;
    stage6: number;
  };
  reason?: string;
  timeframe: string;
  chartData: Array<{ time: number; price: number }>;
}

interface SignalExamplesPanelProps {
  onExampleClick?: (example: ExampleSignal) => void;
}

const EXAMPLE_SIGNALS: ExampleSignal[] = [
  {
    id: '1',
    type: 'success',
    signal: 'LONG',
    entryPrice: 42150,
    exitPrice: 44350,
    stopLoss: 41800,
    takeProfit: [42800, 43500, 44200],
    profit: 5.2,
    stages: {
      stage3: 0.82,
      stage4: 'LONG',
      stage5: 0.88,
      stage6: 0.75
    },
    timeframe: '1h',
    chartData: generateSampleChartData(42150, 44350, true)
  },
  {
    id: '2',
    type: 'success',
    signal: 'SHORT',
    entryPrice: 43800,
    exitPrice: 41650,
    stopLoss: 44200,
    takeProfit: [43200, 42500, 41800],
    profit: 4.8,
    stages: {
      stage3: 0.78,
      stage4: 'SHORT',
      stage5: 0.85,
      stage6: 0.72
    },
    timeframe: '1h',
    chartData: generateSampleChartData(43800, 41650, false)
  },
  {
    id: '3',
    type: 'failure',
    signal: 'LONG',
    entryPrice: 42150,
    exitPrice: 41800,
    stopLoss: 41800,
    loss: -0.8,
    stages: {
      stage3: 0.72,
      stage4: 'LONG',
      stage5: 0.75,
      stage6: 0.45
    },
    reason: 'Core Gate: OK, but Consensus only 45% (needed 60%)',
    timeframe: '1h',
    chartData: generateSampleChartData(42150, 41800, false)
  },
  {
    id: '4',
    type: 'hold',
    signal: 'HOLD',
    entryPrice: 42150,
    stages: {
      stage3: 0.68,
      stage4: 'HOLD',
      stage5: 0.70,
      stage6: 0.52
    },
    reason: 'RSI: 28 (OK), MACD: +0.8 (OK), Final Score: 0.88 (OK), Consensus: 52% (needed 60%)',
    timeframe: '1h',
    chartData: generateSampleChartData(42150, 42150, false)
  }
];

function generateSampleChartData(startPrice: number, endPrice: number, isUp: boolean): Array<{ time: number; price: number }> {
  const data: Array<{ time: number; price: number }> = [];
  const now = Date.now();
  const steps = 20;
  
  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const price = isUp 
      ? startPrice + (endPrice - startPrice) * progress
      : startPrice - (startPrice - endPrice) * progress;
    
    data.push({
      time: now - (steps - i) * 3600000,
      price: price + (Math.random() - 0.5) * (endPrice - startPrice) * 0.1
    });
  }
  
  return data;
}

export const SignalExamplesPanel: React.FC<SignalExamplesPanelProps> = ({ onExampleClick }) => {
  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);


  const [selectedExample, setSelectedExample] = useState<string | null>(null);

  const renderMiniChart = (example: ExampleSignal) => {
    const { chartData, entryPrice, stopLoss, takeProfit, exitPrice } = example;
    if (chartData.length === 0) return null;

    const prices = (chartData || []).map(d => d.price);
    const minPrice = Math.min(...prices, stopLoss || entryPrice, ...(takeProfit || []));
    const maxPrice = Math.max(...prices, stopLoss || entryPrice, ...(takeProfit || []));
    const priceRange = maxPrice - minPrice || 1;
    const width = 200;
    const height = 100;
    const padding = 10;

    return isLoading ? (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  ) : error ? (
    <div className="p-4 bg-red-500/10 text-red-400 rounded">
      Error: {error}
    </div>
  ) : (
      <svg width={width} height={height} className="w-full h-full">
        {/* Background */}
        <rect width={width} height={height} fill="#1E293B" />
        
        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeWidth="1" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeWidth="1" />
        
        {/* Price line */}
        <polyline
          points={(chartData || []).map((d, i) => {
            const x = padding + (i / (chartData.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((d.price - minPrice) / priceRange) * (height - 2 * padding);
            return `${x},${y}`;
          }).join(' ')}
          fill="none"
          stroke={example.type === 'success' ? '#22C55E' : example.type === 'failure' ? '#EF4444' : '#64748B'}
          strokeWidth="2"
        />
        
        {/* Entry marker */}
        <circle
          cx={padding}
          cy={height - padding - ((entryPrice - minPrice) / priceRange) * (height - 2 * padding)}
          r="4"
          fill={example.signal === 'LONG' ? '#22C55E' : example.signal === 'SHORT' ? '#EF4444' : '#64748B'}
        />
        
        {/* Stop Loss line */}
        {stopLoss && (
          <line
            x1={padding}
            y1={height - padding - ((stopLoss - minPrice) / priceRange) * (height - 2 * padding)}
            x2={width - padding}
            y2={height - padding - ((stopLoss - minPrice) / priceRange) * (height - 2 * padding)}
            stroke="#EF4444"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
        )}
        
        {/* Take Profit lines */}
        {takeProfit && (takeProfit || []).map((tp, idx) => (
          <line
            key={idx}
            x1={padding}
            y1={height - padding - ((tp - minPrice) / priceRange) * (height - 2 * padding)}
            x2={width - padding}
            y2={height - padding - ((tp - minPrice) / priceRange) * (height - 2 * padding)}
            stroke="#22C55E"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
        ))}
        
        {/* Exit marker */}
        {exitPrice && (
          <circle
            cx={width - padding}
            cy={height - padding - ((exitPrice - minPrice) / priceRange) * (height - 2 * padding)}
            r="4"
            fill={example.type === 'success' ? '#22C55E' : '#EF4444'}
          />
        )}
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4" id="examples-heading">
        Signal Examples
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="list" aria-labelledby="examples-heading">
        {(EXAMPLE_SIGNALS || []).map((example) => (
          <div
            key={example.id}
            role="listitem"
            tabIndex={0}
            onClick={() => {
              setSelectedExample(example.id);
              onExampleClick?.(example);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedExample(example.id);
                onExampleClick?.(example);
              }
            }}
            className={`
              relative p-4 rounded-xl cursor-pointer transition-all duration-300
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${selectedExample === example.id ? 'ring-2 ring-blue-500 scale-105' : ''}
              ${example.type === 'success' ? 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/20' : ''}
              ${example.type === 'failure' ? 'bg-red-500/10 border border-red-500/30 hover:bg-red-500/20' : ''}
              ${example.type === 'hold' ? 'bg-gray-500/10 border border-gray-500/30 hover:bg-gray-500/20' : ''}
            `}
            aria-label={`${example.type === 'success' ? 'Successful' : example.type === 'failure' ? 'Failed' : 'Hold'} ${example.signal} signal example. Entry: $${example.entryPrice}. ${example.profit ? `Profit: ${example.profit}%` : example.loss ? `Loss: ${example.loss}%` : 'No signal generated'}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {example.type === 'success' && <span className="text-2xl">✅</span>}
                {example.type === 'failure' && <span className="text-2xl">❌</span>}
                {example.type === 'hold' && <span className="text-2xl">⏸️</span>}
                <span className={`font-bold ${
                  example.signal === 'LONG' ? 'text-green-400' : 
                  example.signal === 'SHORT' ? 'text-red-400' : 
                  'text-gray-400'
                }`}>
                  {example.signal}
                </span>
              </div>
              
              {example.profit !== undefined && (
                <span className="text-green-400 font-bold">+{example.profit.toFixed(1)}%</span>
              )}
              {example.loss !== undefined && (
                <span className="text-red-400 font-bold">{example.loss.toFixed(1)}%</span>
              )}
            </div>
            
            {/* Mini Chart */}
            <div className="h-24 mb-2">
              {renderMiniChart(example)}
            </div>
            
            {/* Stage indicators */}
            <div className="flex gap-2 text-xs mb-2">
              <div className="flex-1 p-1 rounded bg-slate-800/50 text-center">
                <div className="text-purple-300">Stage 3</div>
                <div className="text-white font-mono">{example.stages.stage3.toFixed(2)}</div>
              </div>
              <div className="flex-1 p-1 rounded bg-slate-800/50 text-center">
                <div className="text-orange-300">Gate</div>
                <div className={`font-semibold ${
                  example.stages.stage4 === 'LONG' ? 'text-green-400' : 
                  example.stages.stage4 === 'SHORT' ? 'text-red-400' : 
                  'text-gray-400'
                }`}>
                  {example.stages.stage4}
                </div>
              </div>
              <div className="flex-1 p-1 rounded bg-slate-800/50 text-center">
                <div className="text-pink-300">Final</div>
                <div className="text-white font-mono">{example.stages.stage5.toFixed(2)}</div>
              </div>
              <div className="flex-1 p-1 rounded bg-slate-800/50 text-center">
                <div className="text-green-300">Consensus</div>
                <div className={`font-mono ${
                  example.stages.stage6 >= 0.6 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {(example.stages.stage6 * 100).toFixed(0)}%
                </div>
              </div>
            </div>
            
            {/* Reason */}
            {example.reason && (
              <div className="text-xs text-slate-400 mt-2 line-clamp-2">
                {example.reason}
              </div>
            )}
            
            {/* Entry/Exit info */}
            <div className="text-xs text-slate-500 mt-2">
              Entry: ${example.entryPrice.toFixed(0)}
              {example.exitPrice && ` → Exit: $${example.exitPrice.toFixed(0)}`}
            </div>
          </div>
        ))}
      </div>
      
      {/* Full-screen view button */}
      {selectedExample && (
        <button
          onClick={() => {
            const example = EXAMPLE_SIGNALS.find(e => e.id === selectedExample);
            if (example) onExampleClick?.(example);
          }}
          className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          aria-label="View full details of selected signal example"
        >
          View Full Details →
        </button>
      )}
    </div>
  );
};

