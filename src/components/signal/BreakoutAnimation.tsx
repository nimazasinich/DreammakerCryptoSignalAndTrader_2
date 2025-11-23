// BreakoutAnimation.tsx - Animated breakout markers with burst effects
import React, { useEffect, useRef, useState } from 'react';

interface BreakoutAnimationProps {
  x: number;
  y: number;
  direction: 'up' | 'down';
  percentage: number;
  onComplete?: () => void;
}

export const BreakoutAnimation: React.FC<BreakoutAnimationProps> = ({
  x,
  y,
  direction,
  percentage,
  onComplete
}) => {
  const [phase, setPhase] = useState<'burst' | 'glow' | 'fade'>('burst');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) { console.warn("Missing data"); }

    const ctx = canvas.getContext('2d');
    if (!ctx) { console.warn("Missing data"); }

    const size = 120;
    canvas.width = size;
    canvas.height = size;

    let frame = 0;
    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, size, size);
      const centerX = size / 2;
      const centerY = size / 2;
      
      const color = direction === 'up' ? '#22C55E' : '#EF4444';
      
      if (phase === 'burst') {
        // Burst effect - expanding circles
        const progress = frame / 30;
        
        for (let i = 0; i < 3; i++) {
          const radius = (20 + i * 15) * progress;
          const alpha = (1 - progress) * (0.5 - i * 0.15);
          
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        
        // Star burst lines
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const length = 30 * progress;
          const alpha = 1 - progress;
          
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(
            centerX + Math.cos(angle) * length,
            centerY + Math.sin(angle) * length
          );
          ctx.stroke();
          ctx.restore();
        }
        
        if (frame >= 30) {
          setPhase('glow');
          frame = 0;
        }
      } else if (phase === 'glow') {
        // Pulsing glow effect
        const progress = (Math.sin(frame / 10) + 1) / 2;
        const radius = 25 + progress * 5;
        
        // Outer glow
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, radius * 2
        );
        gradient.addColorStop(0, color + 'FF');
        gradient.addColorStop(0.5, color + '80');
        gradient.addColorStop(1, color + '00');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Core circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Arrow
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(direction === 'up' ? '↑' : '↓', centerX, centerY);
        
        if (frame >= 60) {
          setPhase('fade');
          frame = 0;
        }
      } else if (phase === 'fade') {
        // Fade out
        const progress = frame / 20;
        const alpha = 1 - progress;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Draw final state
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(direction === 'up' ? '↑' : '↓', centerX, centerY);
        
        ctx.restore();
        
        if (frame >= 20) {
          onComplete?.();
          return;
        }
      }
      
      frame++;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [phase, direction, onComplete]);

  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        left: x - 60,
        top: y - 60,
        width: 120,
        height: 120
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      {phase === 'glow' && (
        <div
          className="absolute top-[-30px] left-1/2 transform -translate-x-1/2 
                     px-3 py-1 rounded-lg text-white font-bold text-sm whitespace-nowrap
                     animate-bounce"
          style={{
            backgroundColor: direction === 'up' ? '#22C55E' : '#EF4444',
            boxShadow: `0 0 20px ${direction === 'up' ? '#22C55E' : '#EF4444'}`
          }}
        >
          BREAKOUT! {percentage > 0 ? '+' : ''}{percentage.toFixed(1)}%
        </div>
      )}
    </div>
  );
};

