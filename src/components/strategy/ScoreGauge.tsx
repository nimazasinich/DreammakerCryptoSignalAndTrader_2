import React from 'react';

export default function ScoreGauge({ score = 0 }:{ score?: number }) {
  const pct = Math.max(0, Math.min(1, score)) * 100;
  return (
    <div className="w-full p-4 rounded-xl border border-white/20 bg-white/10 backdrop-blur">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">Estimated Strength</span>
        <span className="text-sm">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-3 w-full rounded bg-white/20 overflow-hidden">
        <div
          className="h-3 rounded"
          style={{ width: `${pct}%`, transition: 'width 600ms ease', background: 'linear-gradient(90deg,#22c55e,#3b82f6)' }}
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} role="progressbar"
        />
      </div>
    </div>
  );
}
