// SignalStagePipeline.tsx - 8-Stage Pipeline Visualization
import React, { useState } from 'react';
import { ParticleEffect } from './ParticleEffect';

export interface StageData {
  stage: number;
  name: string;
  status: 'idle' | 'active' | 'completed' | 'failed';
  progress: number; // 0-100
  data?: Record<string, any>;
  icon?: string;
}

interface SignalStagePipelineProps {
  stages: StageData[];
  currentStage?: number;
  onStageClick?: (stage: number) => void;
}

const STAGE_CONFIG = [
  { id: 1, name: 'Market Data', icon: '📊', color: '#3B82F6' },
  { id: 2, name: 'Feature Engineering', icon: '⚙️', color: '#8B5CF6' },
  { id: 3, name: 'Detector Analysis', icon: '🔍', color: '#A78BFA' },
  { id: 4, name: 'Technical Gate', icon: '🚪', color: '#F59E0B' },
  { id: 5, name: 'AI Scoring', icon: '🤖', color: '#EC4899' },
  { id: 6, name: 'Timeframe Consensus', icon: '📈', color: '#10B981' },
  { id: 7, name: 'Risk Management', icon: '🛡️', color: '#F97316' },
  { id: 8, name: 'Final Decision', icon: '✅', color: '#22C55E' },
];

export const SignalStagePipeline: React.FC<SignalStagePipelineProps> = ({
  stages,
  currentStage,
  onStageClick
}) => {
  const getStageConfig = (stageNumber: number) => {
    return STAGE_CONFIG.find(s => s.id === stageNumber) || STAGE_CONFIG[0];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#3B82F6'; // Blue
      case 'completed': return '#22C55E'; // Green
      case 'failed': return '#EF4444'; // Red
      default: return '#64748B'; // Gray
    }
  };

  const renderStageData = (stage: StageData) => {
    const config = getStageConfig(stage.stage);
    
    switch (stage.stage) {
      case 1:
        return stage.data ? (
          <div className="text-xs space-y-1">
            <div className="text-cyan-400">Price: ${stage.data.price?.toFixed(2) || 'N/A'}</div>
            <div className="text-cyan-400">Volume: {stage.data.volume?.toLocaleString() || 'N/A'}</div>
          </div>
        ) : null;
      
      case 3:
        return stage.data?.detectors ? (
          <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
            {Object.entries(stage.data.detectors).map(([name, score]: [string, any]) => (
              <div key={name} className="flex justify-between">
                <span className="text-purple-300">{name}:</span>
                <span className={`font-mono ${score > 0.7 ? 'text-green-400' : score > 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {typeof score === 'number' ? score.toFixed(2) : score}
                </span>
              </div>
            ))}
          </div>
        ) : null;
      
      case 4:
        return stage.data ? (
          <div className="text-xs space-y-1">
            <div className="text-orange-300">RSI: <span className="font-mono">{stage.data.rsi?.toFixed(1) || 'N/A'}</span></div>
            <div className="text-orange-300">MACD: <span className="font-mono">{stage.data.macd?.toFixed(2) || 'N/A'}</span></div>
            <div className={`font-semibold ${
              stage.data.gate === 'LONG' ? 'text-green-400' : 
              stage.data.gate === 'SHORT' ? 'text-red-400' : 
              'text-gray-400'
            }`}>
              Gate: {stage.data.gate || 'HOLD'}
            </div>
          </div>
        ) : null;
      
      case 5:
        return stage.data ? (
          <div className="text-xs space-y-1">
            <div className="text-pink-300">Detector: <span className="font-mono">{stage.data.detectorScore?.toFixed(2) || 'N/A'}</span></div>
            <div className="text-pink-300">AI Boost: <span className="font-mono">+{stage.data.aiBoost?.toFixed(2) || '0.00'}</span></div>
            <div className="text-pink-400 font-semibold">Final: <span className="font-mono">{stage.data.finalScore?.toFixed(2) || 'N/A'}</span></div>
          </div>
        ) : null;
      
      case 6:
        return stage.data?.consensus ? (
          <div className="text-xs space-y-1">
            {['1m', '5m', '15m', '1h'].map(tf => {
              const tfData = stage.data.consensus[tf];
              return tfData ? (
                <div key={tf} className="flex justify-between">
                  <span className="text-green-300">{tf}:</span>
                  <span className={`font-mono ${
                    tfData.action === 'BUY' ? 'text-green-400' : 
                    tfData.action === 'SELL' ? 'text-red-400' : 
                    'text-gray-400'
                  }`}>
                    {tfData.action} ({tfData.confidence?.toFixed(0)}%)
                  </span>
                </div>
              ) : null;
            })}
          </div>
        ) : null;
      
      case 7:
        return stage.data ? (
          <div className="text-xs space-y-1">
            <div className="text-orange-300">ATR: <span className="font-mono">{stage.data.atr?.toFixed(2) || 'N/A'}</span></div>
            <div className={`font-semibold ${
              stage.data.riskLevel === 'LOW' ? 'text-green-400' : 
              stage.data.riskLevel === 'MEDIUM' ? 'text-yellow-400' : 
              'text-red-400'
            }`}>
              Risk: {stage.data.riskLevel || 'N/A'}
            </div>
          </div>
        ) : null;
      
      case 8:
        return stage.data ? (
          <div className="text-xs space-y-1">
            <div className={`text-lg font-bold ${
              stage.data.signal === 'LONG' ? 'text-green-400' : 
              stage.data.signal === 'SHORT' ? 'text-red-400' : 
              'text-gray-400'
            }`}>
              {stage.data.signal || 'HOLD'}
            </div>
            <div className="text-green-300">
              Confidence: <span className="font-mono">{((stage.data.confidence || 0) * 100).toFixed(0)}%</span>
            </div>
          </div>
        ) : null;
      
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {/* Connecting Lines */}
      <svg className="absolute left-8 top-0 w-1 h-full pointer-events-none z-0" style={{ height: '100%' }}>
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="100%"
          stroke="url(#lineGradient)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
      </svg>

      {/* Stages */}
      <div className="space-y-4 relative z-10">
        {(STAGE_CONFIG || []).map((config, index) => {
          const stage = stages.find(s => s.stage === config.id) || {
            stage: config.id,
            name: config.name,
            status: 'idle' as const,
            progress: 0
          };

          const isActive = stage.status === 'active' || currentStage === config.id;
          const isCompleted = stage.status === 'completed';
          const isFailed = stage.status === 'failed';

          return (
            <div
              key={config.id}
              className="relative animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div
                onClick={() => onStageClick?.(config.id)}
                className={`
                  relative flex items-start gap-4 p-4 rounded-xl cursor-pointer
                  transition-all duration-300 overflow-hidden
                  ${isActive ? 'bg-blue-500/20 border-2 border-blue-500/50 shadow-lg shadow-blue-500/20' : ''}
                  ${isCompleted ? 'bg-green-500/10 border border-green-500/30' : ''}
                  ${isFailed ? 'bg-red-500/10 border border-red-500/30' : ''}
                  ${!isActive && !isCompleted && !isFailed ? 'bg-slate-800/30 border border-slate-700/50' : ''}
                  hover:bg-slate-800/50 hover:scale-[1.02]
                `}
              >
                {/* Particle Effect for Active Stage */}
                {isActive && (
                  <ParticleEffect
                    active={true}
                    type="flow"
                    color={config.color}
                    intensity={1}
                    width={300}
                    height={100}
                  />
                )}
                {/* Stage Icon */}
                <div className={`
                  relative flex items-center justify-center w-12 h-12 rounded-full
                  flex-shrink-0
                  ${isActive ? 'animate-pulse' : ''}
                `}
                style={{
                  backgroundColor: isActive ? config.color + '40' : 
                                  isCompleted ? '#22C55E40' : 
                                  isFailed ? '#EF444440' : '#64748B40',
                  border: `2px solid ${getStatusColor(stage.status)}`
                }}>
                  <span className="text-xl">{config.icon}</span>
                  
                  {/* Progress Ring */}
                  {isActive && (
                    <svg className="absolute inset-0 w-12 h-12 transform -rotate-90">
                      <circle
                        cx="24"
                        cy="24"
                        r="22"
                        stroke={config.color}
                        strokeWidth="2"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 22}`}
                        strokeDashoffset={`${2 * Math.PI * 22 * (1 - stage.progress / 100)}`}
                        className="transition-all duration-300"
                      />
                    </svg>
                  )}
                  
                  {isCompleted && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-green-400 text-lg">✓</span>
                    </div>
                  )}
                  
                  {isFailed && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-red-400 text-lg">✗</span>
                    </div>
                  )}
                </div>

                {/* Stage Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-semibold text-sm ${
                      isActive ? 'text-white' : 
                      isCompleted ? 'text-green-400' : 
                      isFailed ? 'text-red-400' : 
                      'text-slate-400'
                    }`}>
                      Stage {config.id}: {config.name}
                    </h3>
                    
                    {isActive && (
                      <span className="text-xs font-mono text-blue-400">
                        {stage.progress}%
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-300 ease-out"
                      style={{
                        width: `${stage.progress}%`,
                        background: `linear-gradient(90deg, ${config.color}, ${config.color}88)`,
                        boxShadow: isActive ? `0 0 8px ${config.color}` : 'none'
                      }}
                    />
                  </div>

                  {/* Stage Data */}
                  {(isActive || isCompleted) && stage.data && (
                    <div className="animate-fade-in">
                      {renderStageData(stage)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

