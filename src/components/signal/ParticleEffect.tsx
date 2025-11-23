// ParticleEffect.tsx - Animated particle effects for signal visualization
import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

interface ParticleEffectProps {
  active: boolean;
  type: 'flow' | 'burst' | 'glow' | 'pulse';
  color?: string;
  intensity?: number;
  width?: number;
  height?: number;
}

export const ParticleEffect: React.FC<ParticleEffectProps> = ({
  active,
  type,
  color = '#3B82F6',
  intensity = 1,
  width = 300,
  height = 100
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) { console.warn("Missing data"); }

    const ctx = canvas.getContext('2d');
    if (!ctx) { console.warn("Missing data"); }

    canvas.width = width;
    canvas.height = height;

    const createParticle = (x?: number, y?: number): Particle => {
      return {
        x: x ?? Math.random() * width,
        y: y ?? Math.random() * height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 0,
        maxLife: 60 + Math.random() * 60,
        size: 2 + Math.random() * 3,
        color: color,
        alpha: 1
      };
    };

    const updateParticles = () => {
      particlesRef.current = particlesRef?.current?.filter(p => p.life < p.maxLife);

      particlesRef.current.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life++;
        particle.alpha = 1 - (particle.life / particle.maxLife);

        // Boundary check
        if (particle.x < 0 || particle.x > width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > height) particle.vy *= -1;
      });

      // Add new particles based on type
      if (active) {
        const particleCount = Math.floor(intensity * 2);
        
        switch (type) {
          case 'flow':
            // Particles flow from left to right
            for (let i = 0; i < particleCount; i++) {
              particlesRef.current.push({
                ...createParticle(0, Math.random() * height),
                vx: 2 + Math.random() * 2,
                vy: (Math.random() - 0.5) * 0.5
              });
            }
            break;
            
          case 'burst':
            // Particles burst from center
            if (particlesRef.current.length < 50) {
              for (let i = 0; i < particleCount * 3; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 3;
                particlesRef.current.push({
                  ...createParticle(width / 2, height / 2),
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed
                });
              }
            }
            break;
            
          case 'glow':
            // Particles orbit around center
            for (let i = 0; i < particleCount; i++) {
              const angle = Math.random() * Math.PI * 2;
              const radius = 20 + Math.random() * 30;
              particlesRef.current.push({
                ...createParticle(
                  width / 2 + Math.cos(angle) * radius,
                  height / 2 + Math.sin(angle) * radius
                ),
                vx: -Math.sin(angle) * 0.5,
                vy: Math.cos(angle) * 0.5
              });
            }
            break;
            
          case 'pulse':
            // Particles pulse outward in waves
            if (particlesRef.current.length < 30) {
              for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const speed = 1.5;
                particlesRef.current.push({
                  ...createParticle(width / 2, height / 2),
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  size: 3
                });
              }
            }
            break;
        }
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particlesRef.current.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        
        // Draw particle with glow effect
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 2
        );
        gradient.addColorStop(0, particle.color);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw core
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });
    };

    const animate = () => {
      updateParticles();
      render();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [active, type, color, intensity, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: active ? 1 : 0, transition: 'opacity 0.3s' }}
    />
  );
};

