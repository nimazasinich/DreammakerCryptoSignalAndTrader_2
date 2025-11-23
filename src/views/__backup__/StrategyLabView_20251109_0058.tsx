import React, { useState, useEffect } from 'react';
import { StrategyTemplate } from '../types/index';
import { Logger } from '../core/Logger';

interface AnimationStage {
  id: number;
  name: string;
  status: 'pending' | 'active' | 'completed';
  progress: number;
  data?: any;
}

export const StrategyLabView: React.FC = () => {
  const [templates, setTemplates] = useState<StrategyTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<string>('live');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [animationStages, setAnimationStages] = useState<AnimationStage[]>([
    { id: 1, name: 'Fetch Data', status: 'pending', progress: 0 },
    { id: 2, name: 'Compute Indicators', status: 'pending', progress: 0 },
    { id: 3, name: 'Pattern Detection', status: 'pending', progress: 0 },
    { id: 4, name: 'Timeframe Merge', status: 'pending', progress: 0 },
    { id: 5, name: 'Multi-TF Analysis', status: 'pending', progress: 0 },
    { id: 6, name: 'Confluence Score', status: 'pending', progress: 0 },
    { id: 7, name: 'Entry Planning', status: 'pending', progress: 0 },
    { id: 8, name: 'Final Output', status: 'pending', progress: 0 }
  ]);

  const [beforeSnapshot, setBeforeSnapshot] = useState<any>(null);
  const [afterSnapshot, setAfterSnapshot] = useState<any>(null);

  // Config knobs
  const [weights, setWeights] = useState({
    ml_ai: 0.18,
    rsi: 0.09,
    macd: 0.09,
    ma_cross: 0.09,
    bollinger: 0.09,
    volume: 0.07,
    support_resistance: 0.09,
    adx: 0.09,
    roc: 0.05,
    market_structure: 0.05,
    reversal: 0.08,
    sentiment: 0.08,
    news: 0.07,
    whales: 0.02
  });

  const [strategyParams, setStrategyParams] = useState({
    neutralEpsilon: 0.05,
    anyThreshold: 0.65,
    majorityThreshold: 0.60,
    confluenceEnabled: true,
    confluenceAiWeight: 0.5,
    confluenceTechWeight: 0.35,
    confluenceContextWeight: 0.15,
    confluenceThreshold: 0.60,
    atrK: 1.2,
    rr: 2.0,
    minLeverage: 2,
    maxLeverage: 10
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const logger = Logger.getInstance();
    try {
      const response = await fetch(`http://localhost:${import.meta.env.VITE_BACKEND_PORT || '3001'}/api/strategy/templates`);
      const data = await response.json();
      if (data.success && data.templates) {
        const templatesData = await Promise.all(
          data.templates.map(async (t: any) => {
            const res = await fetch(`http://localhost:${import.meta.env.VITE_BACKEND_PORT || '3001'}/api/strategy/templates/${t.name}`);
            const tData = await res.json();
            return tData.success ? tData.template : null;
          })
        );
        setTemplates(templatesData.filter(Boolean));
      }
    } catch (error) {
      logger.error('Failed to load templates', {}, error as Error);
    }
  };

  const animateStages = async () => {
    for (let i = 0; i < animationStages.length; i++) {
      // Set current stage as active
      setAnimationStages(prev => prev.map((stage, idx) => ({
        ...stage,
        status: idx === i ? 'active' : idx < i ? 'completed' : 'pending',
        progress: idx < i ? 100 : 0
      })));

      // Animate progress
      for (let p = 0; p <= 100; p += 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        setAnimationStages(prev => prev.map((stage, idx) =>
          idx === i ? { ...stage, progress: p } : stage
        ));
        setSimulationProgress(((i * 100) + p) / animationStages.length);
      }

      // Mark as completed
      setAnimationStages(prev => prev.map((stage, idx) =>
        idx === i ? { ...stage, status: 'completed', progress: 100 } : stage
      ));
    }
  };

  const handleSimulate = async () => {
    const logger = Logger.getInstance();
    setIsSimulating(true);
    setSimulationProgress(0);
    setBeforeSnapshot(null);
    setAfterSnapshot(null);

    try {
      // Get baseline (before) snapshot
      const beforeRes = await fetch(`http://localhost:${import.meta.env.VITE_BACKEND_PORT || '3001'}/api/scoring/snapshot?symbol=BTCUSDT&tfs=15m&tfs=1h&tfs=4h`);
      const beforeData = await beforeRes.json();
      if (beforeData.success) {
        setBeforeSnapshot(beforeData.snapshot);
      }

      // Animate stages
      await animateStages();

      // Get after snapshot with overrides
      const overrideParams = new URLSearchParams({
        symbol: 'BTCUSDT',
        simulate: '1',
        neutralEpsilon: strategyParams.neutralEpsilon.toString(),
        anyThreshold: strategyParams.anyThreshold.toString(),
        majorityThreshold: strategyParams.majorityThreshold.toString(),
        confluenceEnabled: strategyParams.confluenceEnabled.toString(),
        confluenceAiWeight: strategyParams.confluenceAiWeight.toString(),
        confluenceTechWeight: strategyParams.confluenceTechWeight.toString(),
        confluenceContextWeight: strategyParams.confluenceContextWeight.toString(),
        confluenceThreshold: strategyParams.confluenceThreshold.toString(),
        atrK: strategyParams.atrK.toString(),
        rr: strategyParams.rr.toString(),
        minLeverage: strategyParams.minLeverage.toString(),
        maxLeverage: strategyParams.maxLeverage.toString(),
        weights: JSON.stringify(weights)
      });
      overrideParams.append('tfs', '15m');
      overrideParams.append('tfs', '1h');
      overrideParams.append('tfs', '4h');

      const afterRes = await fetch(`http://localhost:${import.meta.env.VITE_BACKEND_PORT || '3001'}/api/scoring/snapshot?${overrideParams.toString()}`);
      const afterData = await afterRes.json();
      if (afterData.success) {
        setAfterSnapshot(afterData.snapshot);
      }

    } catch (error) {
      logger.error('Simulation failed', {}, error as Error);
      alert('Simulation failed: ' + (error as Error).message);
    }

    setIsSimulating(false);
  };

  const handleSaveTemplate = async () => {
    const name = prompt('Enter template name:');
    if (!name) return;

    try {
      const response = await fetch(`http://localhost:${import.meta.env.VITE_BACKEND_PORT || '3001'}/api/strategy/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          payload: {
            scoringWeights: weights,
            strategyConfig: strategyParams
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        await loadTemplates();
        alert(`Template "${name}" saved successfully`);
      } else {
        alert(`Failed to save template: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to save template: ' + (error as Error).message);
    }
  };

  const handleLoadTemplate = (template: any) => {
    if (template.payload) {
      if (template.payload.scoringWeights) {
        setWeights({ ...weights, ...template.payload.scoringWeights });
      }
      if (template.payload.strategyConfig) {
        setStrategyParams({ ...strategyParams, ...template.payload.strategyConfig });
      }
      setCurrentTemplate(template.name);
      alert(`Template "${template.name}" loaded successfully`);
    }
  };

  const handleWeightChange = (key: string, value: number) => {
    setWeights({ ...weights, [key]: value });
  };

  const handleParamChange = (key: string, value: number | boolean) => {
    setStrategyParams({ ...strategyParams, [key]: value });
  };

  const getStageColor = (status: string) => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'active') return 'bg-purple-600';
    return 'bg-gray-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Strategy Lab</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Templates Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 space-y-4" style={{ borderRadius: '14px' }}>
              <h2 className="text-xl font-bold text-gray-800">Templates</h2>

              <button
                onClick={() => {
                  setCurrentTemplate('live');
                  alert('Live settings loaded');
                }}
                className={`w-full px-4 py-3 rounded-xl font-semibold text-right transition-all ${
                  currentTemplate === 'live'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={{ borderRadius: '12px' }}
              >
                <div className="text-sm font-semibold">Live Settings</div>
                <div className="text-xs opacity-75">Currently active settings</div>
              </button>

              {templates.map(template => (
                <button
                  key={template.name}
                  onClick={() => handleLoadTemplate(template)}
                  className={`w-full px-4 py-3 rounded-xl font-semibold text-right transition-all ${
                    currentTemplate === template.name
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{ borderRadius: '12px' }}
                >
                  <div className="text-sm font-semibold">{template.name}</div>
                  {template.payload?.description && <div className="text-xs opacity-75">{template.payload.description}</div>}
                </button>
              ))}

              <button
                onClick={handleSaveTemplate}
                className="w-full px-4 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all"
                style={{ borderRadius: '12px' }}
              >
                Save as Template
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Simulation Bar */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200" style={{ borderRadius: '14px' }}>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Simulation</h2>

              {/* Animation Pipeline */}
              {isSimulating && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    {animationStages.map((stage) => (
                      <div key={stage.id} className="flex-1 text-center">
                        <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-white font-bold ${getStageColor(stage.status)}`}>
                          {stage.status === 'completed' ? '✓' : stage.id}
                        </div>
                        <div className="text-xs mt-2 text-gray-600">{stage.name}</div>
                        {stage.status === 'active' && (
                          <div className="mt-1 text-xs font-semibold text-purple-600">{stage.progress}%</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 transition-all duration-300"
                      style={{ width: `${simulationProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handleSimulate}
                  disabled={isSimulating}
                  className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
                    isSimulating
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg'
                  }`}
                  style={{ borderRadius: '12px' }}
                >
                  {isSimulating ? 'Simulating...' : 'Run Simulation'}
                </button>
              </div>

              {/* Before vs After Comparison */}
              {beforeSnapshot && afterSnapshot && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200" style={{ borderRadius: '12px' }}>
                    <h3 className="text-sm font-bold text-gray-700 mb-2">Before</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Action:</span>
                        <span className={`font-semibold ${
                          beforeSnapshot.action === 'BUY' ? 'text-green-600' :
                          beforeSnapshot.action === 'SELL' ? 'text-red-600' : 'text-gray-600'
                        }`}>{beforeSnapshot.action}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Score:</span>
                        <span className="font-semibold text-purple-600">{(beforeSnapshot.final_score * 100).toFixed(1)}%</span>
                      </div>
                      {beforeSnapshot.confluence && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Confluence:</span>
                          <span className="font-semibold text-blue-600">{(beforeSnapshot.confluence.score * 100).toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200" style={{ borderRadius: '12px' }}>
                    <h3 className="text-sm font-bold text-purple-700 mb-2">After</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Action:</span>
                        <span className={`font-semibold ${
                          afterSnapshot.action === 'BUY' ? 'text-green-600' :
                          afterSnapshot.action === 'SELL' ? 'text-red-600' : 'text-gray-600'
                        }`}>{afterSnapshot.action}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Score:</span>
                        <span className="font-semibold text-purple-600">{(afterSnapshot.final_score * 100).toFixed(1)}%</span>
                      </div>
                      {afterSnapshot.confluence && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Confluence:</span>
                          <span className="font-semibold text-blue-600">{(afterSnapshot.confluence.score * 100).toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Detector Weights */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200" style={{ borderRadius: '14px' }}>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Detector Weights</h2>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(weights).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-semibold text-gray-700">
                        {key.replace(/_/g, ' ')}
                      </label>
                      <span className="text-sm font-mono text-purple-600 bg-purple-50 px-2 py-1 rounded">
                        {value.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.3"
                      step="0.01"
                      value={value}
                      onChange={(e) => handleWeightChange(key, parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Strategy Parameters */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200" style={{ borderRadius: '14px' }}>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Strategy Parameters</h2>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(strategyParams).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-semibold text-gray-700">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <span className="text-sm font-mono text-purple-600 bg-purple-50 px-2 py-1 rounded">
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value.toFixed(2)}
                      </span>
                    </div>
                    {typeof value === 'boolean' ? (
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => handleParamChange(key, e.target.checked)}
                          className="w-5 h-5 text-purple-600 rounded accent-purple-600"
                        />
                        <span className="mr-2 text-sm text-gray-600">Enable</span>
                      </label>
                    ) : (
                      <input
                        type="range"
                        min={key.includes('Leverage') ? 1 : 0}
                        max={key === 'minLeverage' || key === 'maxLeverage' ? 20 : key === 'rr' ? 5 : 1}
                        step={key.includes('Leverage') ? 1 : 0.01}
                        value={value as number}
                        onChange={(e) => handleParamChange(key, parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
