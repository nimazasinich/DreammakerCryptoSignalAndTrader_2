// components/AdvancedChart.tsx
import React, { useRef, useEffect, useState } from 'react';
import { ChartOverlay, TechnicalData, OverlayConfig } from './charts/ChartOverlay';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface AdvancedChartProps {
  data: CandleData[];
  symbol: string;
  timeframe: string;
  onChartReady?: () => void;
  technicals?: TechnicalData;
  overlayConfig?: OverlayConfig;
}

export const AdvancedChart: React.FC<AdvancedChartProps> = ({ 
  data, 
  symbol, 
  timeframe,
  onChartReady,
  technicals,
  overlayConfig
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  // Update dimensions when container size changes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) { console.warn("Missing data"); }

    const ctx = canvas.getContext('2d');
    if (!ctx) { console.warn("Missing data"); }

  // Canvas configuration
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

  // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (data.length === 0) {
      drawEmptyState(ctx, canvas.width, canvas.height);
      return;
    }

  // Draw chart
    drawCandlestickChart(ctx, data, canvas.width, canvas.height);
    
    onChartReady?.();
  }, [data, dimensions, onChartReady]);

  const drawEmptyState = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#64748b';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Loading chart data...', width / 2, height / 2);
  };

  const padding = 50;

  const drawCandlestickChart = (
    ctx: CanvasRenderingContext2D, 
    data: CandleData[], 
    width: number, 
    height: number
  ) => {
  // Scale calculations
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    const prices = data.flatMap(d => [d.high, d.low]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;

    const candleWidth = chartWidth / data.length * 0.7;

  // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

  // Render candles
    data.forEach((candle, index) => {
      const x = padding + (index * chartWidth) / data.length;
      const yOpen = padding + chartHeight - ((candle.open - minPrice) / priceRange) * chartHeight;
      const yClose = padding + chartHeight - ((candle.close - minPrice) / priceRange) * chartHeight;
      const yHigh = padding + chartHeight - ((candle.high - minPrice) / priceRange) * chartHeight;
      const yLow = padding + chartHeight - ((candle.low - minPrice) / priceRange) * chartHeight;

      const isBullish = candle.close > candle.open;
      
    // Candle body
      ctx.fillStyle = isBullish ? '#10b981' : '#ef4444';
      ctx.fillRect(x - candleWidth/2, Math.min(yOpen, yClose), candleWidth, Math.abs(yOpen - yClose));

    // Shadows
      ctx.strokeStyle = isBullish ? '#10b981' : '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, Math.min(yOpen, yClose));
      ctx.moveTo(x, Math.max(yOpen, yClose));
      ctx.lineTo(x, yLow);
      ctx.stroke();
    });

  // Grid and axes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    
  // Horizontal lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i * chartHeight) / 5;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      const price = maxPrice - (i * priceRange) / 5;
      ctx.fillStyle = '#64748b';
      ctx.font = '12px Arial';
      ctx.fillText(price.toFixed(2), padding - 40, y + 4);
    }

  // Chart border
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, padding, chartWidth, chartHeight);
  };

  const defaultOverlayConfig: OverlayConfig = {
    showSupportResistance: false,
    showOrderBlocks: false,
    showFibonacci: false,
    showElliottWaves: false,
    showHarmonicPatterns: false,
    showEntryExit: false,
    ...overlayConfig
  };

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: '600px', minHeight: '400px' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 rounded-lg cursor-crosshair"
        style={{ width: '100%', height: '100%' }}
      />
      {technicals && overlayConfig && (
        <ChartOverlay
          data={data}
          technicals={technicals}
          config={defaultOverlayConfig}
          width={dimensions.width}
          height={dimensions.height}
          padding={padding}
        />
      )}
    </div>
  );
};