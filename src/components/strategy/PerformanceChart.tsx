import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface PerformanceDataPoint {
  timestamp: number;
  score: number;
  confidence: number;
  action: string;
}

interface PerformanceChartProps {
  currentScore: number;
  currentConfidence: number;
  currentAction: string;
  isLive?: boolean;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  currentScore,
  currentConfidence,
  currentAction,
  isLive = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataPoints, setDataPoints] = useState<PerformanceDataPoint[]>([]);
  const [maxDataPoints] = useState(50);
  const animationFrameRef = useRef<number>();

  // Add new data point when metrics change
  useEffect(() => {
    if (isLive) {
      const newPoint: PerformanceDataPoint = {
        timestamp: Date.now(),
        score: currentScore,
        confidence: currentConfidence,
        action: currentAction
      };

      setDataPoints(prev => {
        const updated = [...prev, newPoint];
        // Keep only the last N points
        if ((updated?.length || 0) > maxDataPoints) {
          return updated.slice(updated.length - maxDataPoints);
        }
        return updated;
      });
    }
  }, [currentScore, currentConfidence, currentAction, isLive, maxDataPoints]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) { console.warn("Missing data"); }

    const ctx = canvas.getContext('2d');
    if (!ctx) { console.warn("Missing data"); }

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Background gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, '#f8f9fa');
      bgGradient.addColorStop(1, '#ffffff');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Draw grid
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;

      // Horizontal grid lines
      for (let i = 0; i <= 10; i++) {
        const y = (height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        // Y-axis labels
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${100 - i * 10}`, width - 5, y + 3);
      }

      // Vertical grid lines
      const numVerticalLines = 10;
      for (let i = 0; i <= numVerticalLines; i++) {
        const x = (width / numVerticalLines) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      if (dataPoints.length < 2) return;

      // Calculate scale
      const xScale = width / (maxDataPoints - 1);
      const yScale = height / 100;

      // Draw score line
      ctx.beginPath();
      ctx.strokeStyle = '#8b5cf6'; // purple
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';

      dataPoints.forEach((point, i) => {
        const x = i * xScale;
        const y = height - (point.score * yScale);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw score area fill
      ctx.lineTo(dataPoints.length * xScale, height);
      ctx.lineTo(0, height);
      ctx.closePath();

      const scoreGradient = ctx.createLinearGradient(0, 0, 0, height);
      scoreGradient.addColorStop(0, 'rgba(139, 92, 246, 0.2)');
      scoreGradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');
      ctx.fillStyle = scoreGradient;
      ctx.fill();

      // Draw confidence line
      ctx.beginPath();
      ctx.strokeStyle = '#3b82f6'; // blue
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      dataPoints.forEach((point, i) => {
        const x = i * xScale;
        const y = height - (point.confidence * yScale);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw data points
      dataPoints.forEach((point, i) => {
        const x = i * xScale;
        const yScore = height - (point.score * yScale);
        const yConf = height - (point.confidence * yScale);

        // Score point
        ctx.beginPath();
        ctx.arc(x, yScore, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#8b5cf6';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Confidence point
        ctx.beginPath();
        ctx.arc(x, yConf, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Action indicator (last point only)
        if (i === dataPoints.length - 1) {
          const arrowSize = 12;
          const arrowY = yScore - 20;

          if (point.action === 'BUY') {
            // Up arrow
            ctx.beginPath();
            ctx.moveTo(x, arrowY);
            ctx.lineTo(x - arrowSize / 2, arrowY + arrowSize);
            ctx.lineTo(x + arrowSize / 2, arrowY + arrowSize);
            ctx.closePath();
            ctx.fillStyle = '#10b981'; // green
            ctx.fill();
          } else if (point.action === 'SELL') {
            // Down arrow
            ctx.beginPath();
            ctx.moveTo(x, arrowY + arrowSize);
            ctx.lineTo(x - arrowSize / 2, arrowY);
            ctx.lineTo(x + arrowSize / 2, arrowY);
            ctx.closePath();
            ctx.fillStyle = '#ef4444'; // red
            ctx.fill();
          }
        }
      });

      // Draw legend
      const legendX = 10;
      const legendY = 10;
      const legendWidth = 140;
      const legendHeight = 60;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
      ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

      // Score legend
      ctx.fillStyle = '#8b5cf6';
      ctx.fillRect(legendX + 10, legendY + 15, 20, 3);
      ctx.fillStyle = '#374151';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Score', legendX + 35, legendY + 20);

      // Confidence legend
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(legendX + 10, legendY + 35);
      ctx.lineTo(legendX + 30, legendY + 35);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#374151';
      ctx.fillText('Confidence', legendX + 35, legendY + 38);

      // Live indicator
      if (isLive) {
        ctx.beginPath();
        ctx.arc(legendX + 15, legendY + 52, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('LIVE', legendX + 25, legendY + 56);
      }
    };

    const animate = () => {
      draw();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dataPoints, isLive, maxDataPoints]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) { console.warn("Missing data"); }

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = 300;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const getStats = () => {
    if (dataPoints.length === 0) return null;

    const scores = (dataPoints || []).map(d => d.score);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

    const lastPoint = dataPoints[dataPoints.length - 1];
    const firstPoint = dataPoints[0];
    const change = lastPoint.score - firstPoint.score;

    return { max, min, avg, change };
  };

  const stats = getStats();

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600" />
          Real-Time Performance Chart
          {isLive && (
            <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full animate-pulse flex items-center gap-1">
              <span className="w-2 h-2 bg-white rounded-full"></span>
              LIVE
            </span>
          )}
        </h2>

        {stats && (
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="text-xs text-gray-500">Avg</div>
              <div className="font-semibold text-purple-600">{stats.avg.toFixed(1)}%</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">Max</div>
              <div className="font-semibold text-green-600">{stats.max.toFixed(1)}%</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">Min</div>
              <div className="font-semibold text-red-600">{stats.min.toFixed(1)}%</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">Change</div>
              <div className={`font-semibold flex items-center gap-1 ${stats.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(stats.change).toFixed(1)}%
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full rounded-lg border border-gray-200"
          style={{ height: '300px' }}
        />

        {dataPoints.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">
                {isLive ? 'Waiting for live data...' : 'Enable Live Preview to see real-time updates'}
              </p>
            </div>
          </div>
        )}
      </div>

      {isLive && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Live Mode Active:</strong> The chart updates automatically as you adjust parameters.
            See how your changes affect strategy performance in real-time!
          </p>
        </div>
      )}
    </div>
  );
};
