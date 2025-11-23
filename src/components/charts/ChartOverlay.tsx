// ChartOverlay.tsx - Technical indicators overlay for chart
import React, { useRef, useEffect, useState } from 'react';
import { BreakoutAnimation } from '../signal/BreakoutAnimation';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OverlayConfig {
  showSupportResistance: boolean;
  showOrderBlocks: boolean;
  showFibonacci: boolean;
  showElliottWaves: boolean;
  showHarmonicPatterns: boolean;
  showEntryExit: boolean;
}

export interface TechnicalData {
  support?: number[];
  resistance?: number[];
  orderBlocks?: Array<{ price: number; type: 'bullish' | 'bearish'; strength: number; time: number }>;
  fibonacci?: { levels: number[]; start: number; end: number };
  elliottWaves?: Array<{ label: string; price: number; time: number }>;
  harmonicPatterns?: Array<{ type: string; points: Array<{ price: number; time: number }>; confidence: number }>;
  entryExit?: {
    entry?: { price: number; time: number; type: 'LONG' | 'SHORT' };
    stopLoss?: { price: number; time: number };
    takeProfit?: Array<{ price: number; time: number }>;
  };
  breakoutPoints?: Array<{ price: number; time: number; direction: 'up' | 'down'; percentage: number }>;
}

interface ChartOverlayProps {
  data: CandleData[];
  technicals: TechnicalData;
  config: OverlayConfig;
  width: number;
  height: number;
  padding: number;
}

export const ChartOverlay: React.FC<ChartOverlayProps> = ({
  data,
  technicals,
  config,
  width,
  height,
  padding
}) => {
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [activeBreakouts, setActiveBreakouts] = useState<Array<{
    id: string;
    x: number;
    y: number;
    direction: 'up' | 'down';
    percentage: number;
  }>>([]);

  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) { console.warn("Missing data"); }

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Price range calculations
    const prices = data.flatMap(d => [d.high, d.low]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    const priceToY = (price: number) => {
      return padding + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    };

    const timeToX = (time: number) => {
      const timeRange = data[data.length - 1].time - data[0].time;
      const relativeTime = time - data[0].time;
      return padding + (relativeTime / timeRange) * chartWidth;
    };

    // Draw Support/Resistance Lines
    if (config.showSupportResistance) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      
      // Support lines (green)
      if (technicals.support) {
        technicals.support.forEach((price, idx) => {
          ctx.strokeStyle = '#22C55E';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(padding, priceToY(price));
          ctx.lineTo(width - padding, priceToY(price));
          ctx.stroke();
          
          // Label
          ctx.fillStyle = '#22C55E';
          ctx.font = '12px Arial';
          ctx.textAlign = 'right';
          ctx.setLineDash([]);
          ctx.fillText(`Support $${price.toFixed(0)}`, width - padding - 10, priceToY(price) - 5);
        });
      }
      
      // Resistance lines (red)
      if (technicals.resistance) {
        technicals.resistance.forEach((price, idx) => {
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(padding, priceToY(price));
          ctx.lineTo(width - padding, priceToY(price));
          ctx.stroke();
          
          // Label
          ctx.fillStyle = '#EF4444';
          ctx.font = '12px Arial';
          ctx.textAlign = 'right';
          ctx.setLineDash([]);
          ctx.fillText(`Resistance $${price.toFixed(0)}`, width - padding - 10, priceToY(price) - 5);
        });
      }
      
      ctx.restore();
    }

    // Draw Order Blocks
    if (config.showOrderBlocks && technicals.orderBlocks) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      
      technicals.orderBlocks.forEach((block) => {
        const x = timeToX(block.time);
        const blockHeight = chartHeight * 0.05; // 5% of chart height
        const y = priceToY(block.price) - blockHeight / 2;
        
        ctx.fillStyle = block.type === 'bullish' ? '#8B5CF6' : '#A78BFA';
        ctx.fillRect(x - 20, y, 40, blockHeight);
        
        ctx.strokeStyle = '#8B5CF6';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 20, y, 40, blockHeight);
        
        // Label
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`OB ${block.type}`, x, y + blockHeight / 2);
        ctx.globalAlpha = 0.2;
      });
      
      ctx.restore();
    }

    // Draw Fibonacci Levels
    if (config.showFibonacci && technicals.fibonacci) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      
      const fibLevels = technicals.fibonacci.levels || [0, 0.236, 0.382, 0.5, 0.618, 1.0];
      const startPrice = technicals.fibonacci.start;
      const endPrice = technicals.fibonacci.end;
      const priceDiff = endPrice - startPrice;
      
      fibLevels.forEach((level) => {
        const price = startPrice + (priceDiff * level);
        const y = priceToY(price);
        
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        
        // Label
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#FBBF24';
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        ctx.setLineDash([]);
        ctx.fillText(`${(level * 100).toFixed(1)}%`, padding + 5, y - 5);
        ctx.globalAlpha = 0.3;
      });
      
      ctx.restore();
    }

    // Draw Entry/Exit Markers
    if (config.showEntryExit && technicals.entryExit) {
      const { entry, stopLoss, takeProfit } = technicals.entryExit;
      
      // Entry marker
      if (entry) {
        const x = timeToX(entry.time);
        const y = priceToY(entry.price);
        
        ctx.save();
        ctx.fillStyle = entry.type === 'LONG' ? '#22C55E' : '#EF4444';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        
        // Draw arrow
        ctx.beginPath();
        if (entry.type === 'LONG') {
          ctx.moveTo(x, y + 20);
          ctx.lineTo(x - 10, y);
          ctx.lineTo(x + 10, y);
          ctx.closePath();
        } else {
          ctx.moveTo(x, y - 20);
          ctx.lineTo(x - 10, y);
          ctx.lineTo(x + 10, y);
          ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();
        
        // Label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${entry.type} Entry`, x, entry.type === 'LONG' ? y - 25 : y + 35);
        ctx.fillText(`$${entry.price.toFixed(2)}`, x, entry.type === 'LONG' ? y - 40 : y + 50);
        
        ctx.restore();
      }
      
      // Stop Loss marker
      if (stopLoss) {
        const y = priceToY(stopLoss.price);
        ctx.save();
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        
        ctx.fillStyle = '#EF4444';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.setLineDash([]);
        ctx.fillText(`SL $${stopLoss.price.toFixed(2)}`, width - padding - 10, y - 5);
        ctx.restore();
      }
      
      // Take Profit markers
      if (takeProfit) {
        takeProfit.forEach((tp, idx) => {
          const y = priceToY(tp.price);
          ctx.save();
          ctx.strokeStyle = '#22C55E';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(padding, y);
          ctx.lineTo(width - padding, y);
          ctx.stroke();
          
          ctx.fillStyle = '#22C55E';
          ctx.font = '12px Arial';
          ctx.textAlign = 'right';
          ctx.setLineDash([]);
          ctx.fillText(`TP${idx + 1} $${tp.price.toFixed(2)}`, width - padding - 10, y - 5);
          ctx.restore();
        });
      }
    }

    // Draw Breakout Points (trigger animations)
    if (technicals.breakoutPoints) {
      technicals.breakoutPoints.forEach((breakout) => {
        const x = timeToX(breakout.time);
        const y = priceToY(breakout.price);
        
        // Add to active breakouts if not already present
        const breakoutId = `${breakout.time}-${breakout.price}`;
        if (!activeBreakouts.find(b => b.id === breakoutId)) {
          setActiveBreakouts(prev => [...prev, {
            id: breakoutId,
            x,
            y,
            direction: breakout.direction,
            percentage: breakout.percentage
          }]);
        }
      });
    }

    // Draw Elliott Wave Labels
    if (config.showElliottWaves && technicals.elliottWaves) {
      technicals.elliottWaves.forEach((wave) => {
        const x = timeToX(wave.time);
        const y = priceToY(wave.price);
        
        ctx.save();
        ctx.fillStyle = '#3B82F6';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        
        // Circle background
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(wave.label, x, y + 5);
        
        ctx.restore();
      });
    }

    // Draw Harmonic Patterns
    if (config.showHarmonicPatterns && technicals.harmonicPatterns) {
      technicals.harmonicPatterns.forEach((pattern) => {
        if ((pattern.points?.length || 0) >= 4) {
          ctx.save();
          ctx.strokeStyle = '#8B5CF6';
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.6;
          
          // Draw pattern lines
          ctx.beginPath();
          pattern.points.forEach((point, idx) => {
            const x = timeToX(point.time);
            const y = priceToY(point.price);
            
            if (idx === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });
          ctx.stroke();
          
          // Fill pattern area
          ctx.globalAlpha = 0.1;
          ctx.fillStyle = '#8B5CF6';
          ctx.fill();
          
          // Label
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = '#8B5CF6';
          ctx.font = 'bold 11px Arial';
          ctx.textAlign = 'center';
          const centerX = pattern?.points?.reduce((sum, p) => sum + timeToX(p.time), 0) / pattern.points.length;
          const centerY = pattern?.points?.reduce((sum, p) => sum + priceToY(p.price), 0) / pattern.points.length;
          ctx.fillText(`${pattern.type} ${(pattern.confidence * 100).toFixed(0)}%`, centerX, centerY);
          
          ctx.restore();
        }
      });
    }
  }, [data, technicals, config, width, height, padding]);

  const handleBreakoutComplete = (id: string) => {
    setActiveBreakouts(prev => prev.filter(b => b.id !== id));
  };

  return (
    <>
      <canvas
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 10 }}
      />
      {/* Render breakout animations */}
      {(activeBreakouts || []).map(breakout => (
        <BreakoutAnimation
          key={breakout.id}
          x={breakout.x}
          y={breakout.y}
          direction={breakout.direction}
          percentage={breakout.percentage}
          onComplete={() => handleBreakoutComplete(breakout.id)}
        />
      ))}
    </>
  );
};

