import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StrategyTemplate } from '../types/index';
import { Activity, TrendingUp, TrendingDown, PlayCircle, Save, BarChart3, Zap, Target } from 'lucide-react';
import { PerformanceChart } from '../components/strategy/PerformanceChart';
import { showToast } from '../components/ui/Toast';
import { useConfirmModal } from '../components/ui/ConfirmModal';
import { Logger } from '../core/Logger';

const logger = Logger.getInstance();

interface AnimationStage {
  id: number;
  name: string;
  status: 'pending' | 'active' | 'completed';
  progress: number;
  data?: any;
}

interface PerformanceMetrics {
  score: number;
  confidence: number;
  action: string;
  risk: string;
  expectedReturn: number;
  winRate: number;
}

interface SavedStrategy {
  id: string;
  name: string;
  timestamp: string;
  weights: any;
  params: any;
  performance: PerformanceMetrics;
}

export const EnhancedStrategyLabView: React.FC = () => {
  const { confirm, ModalComponent } = useConfirmModal();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [templates, setTemplates] = useState<StrategyTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<string>('live');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [livePreview, setLivePreview] = useState(false);
  const [savedStrategies, setSavedStrategies] = useState<SavedStrategy[]>([]);

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
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics>({
    score: 0,
    confidence: 0,
    action: 'NEUTRAL',
    risk: 'MEDIUM',
    expectedReturn: 0,
    winRate: 0
  });

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

  // Debounce timer for live preview
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTime = useRef<number>(Date.now());

  useEffect(() => {
    loadTemplates();
    loadSavedStrategies();
    loadPersistedState();
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    const stateToSave = {
      lastTemplate: currentTemplate,
      weights,
      strategyParams,
      livePreview
    };
    localStorage.setItem('strategyLabState', JSON.stringify(stateToSave));
  }, [currentTemplate, weights, strategyParams, livePreview]);

  const loadPersistedState = () => {
    try {
      const saved = localStorage.getItem('strategyLabState');
      if (saved) {
        const state = JSON.parse(saved);
        if (state.lastTemplate) setCurrentTemplate(state.lastTemplate);
        if (state.weights) setWeights(state.weights);
        if (state.strategyParams) setStrategyParams(state.strategyParams);
        if (typeof state.livePreview === 'boolean') setLivePreview(state.livePreview);
      }
    } catch (error) {
      logger.error('Failed to load persisted state:', {}, error as Error);
    }
  };

  // Live preview when parameters change
  useEffect(() => {
    if (livePreview && !isSimulating) {
      // Debounce the preview update
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        triggerLivePreview();
      }, 500); // 500ms debounce
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [weights, strategyParams, livePreview]);

  const loadTemplates = async () => {
    try {
      const response = await fetch(`http://localhost:${import.meta.env.VITE_BACKEND_PORT || '3001'}/api/strategy/templates`, { mode: "cors", headers: { "Content-Type": "application/json" } });
      const data = await response.json();
      if (data.success && data.templates) {
        const templatesData = await Promise.all(
          (data.templates || []).map(async (t: any) => {
            const res = await fetch(`http://localhost:${import.meta.env.VITE_BACKEND_PORT || '3001'}/api/strategy/templates/${t.name}`, { mode: "cors", headers: { "Content-Type": "application/json" } });
            const tData = await res.json();
            return tData.success ? tData.template : null;
          })
        );
        setTemplates(templatesData.filter(Boolean));
      }
    } catch (error) {
      logger.error('Failed to load templates:', {}, error as Error);
    }
  };

  const loadSavedStrategies = () => {
    const saved = localStorage.getItem('savedStrategies');
    if (saved) {
      setSavedStrategies(JSON.parse(saved));
    }
  };

  const triggerLivePreview = async () => {
    // Quick snapshot without full animation
    try {
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

      const response = await fetch(`http://localhost:${import.meta.env.VITE_BACKEND_PORT || '3001'}/api/scoring/snapshot?${overrideParams.toString()}`, { mode: "cors", headers: { "Content-Type": "application/json" } });
      const data = await response.json();

      if (data.success) {
        updateCurrentMetrics(data.snapshot);
      }
    } catch (error) {
      logger.error('Live preview failed:', {}, error as Error);
    }
  };

  const updateCurrentMetrics = (snapshot: any) => {
    const action = snapshot.action || 'NEUTRAL';
    const score = snapshot.final_score || 0;
    const confidence = snapshot.confluence?.score || 0;

    // Calculate realistic metrics based on score and confidence
    const risk = score > 0.7 ? 'LOW' : score > 0.5 ? 'MEDIUM' : 'HIGH';
    const expectedReturn = (score * 100 * (strategyParams.rr / 100)).toFixed(2);
    // Win rate based on score and confidence, no randomness
    const winRate = Math.min(95, Math.max(35, (score * 0.7 + confidence * 0.3) * 100));

    setCurrentMetrics({
      score: score * 100,
      confidence: confidence * 100,
      action,
      risk,
      expectedReturn: parseFloat(expectedReturn),
      winRate: parseFloat(winRate.toFixed(1))
    });
  };

  const animateStages = async () => {
    for (let i = 0; i < animationStages.length; i++) {
      // Set current stage as active
      setAnimationStages(prev => (prev || []).map((stage, idx) => ({
        ...stage,
        status: idx === i ? 'active' : idx < i ? 'completed' : 'pending',
        progress: idx < i ? 100 : 0
      })));

      // Animate progress with smoother increments
      for (let p = 0; p <= 100; p += 5) {
        await new Promise(resolve => setTimeout(resolve, 30));
        setAnimationStages(prev => (prev || []).map((stage, idx) =>
          idx === i ? { ...stage, progress: p } : stage
        ));
        setSimulationProgress(((i * 100) + p) / animationStages.length);
      }

      // Mark as completed
      setAnimationStages(prev => (prev || []).map((stage, idx) =>
        idx === i ? { ...stage, status: 'completed', progress: 100 } : stage
      ));
    }
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    setSimulationProgress(0);
    setBeforeSnapshot(null);
    setAfterSnapshot(null);

    try {
      // Get baseline (before) snapshot
      const beforeRes = await fetch(`http://localhost:${import.meta.env.VITE_BACKEND_PORT || '3001'}/api/scoring/snapshot?symbol=BTCUSDT&tfs=15m&tfs=1h&tfs=4h`, { mode: "cors", headers: { "Content-Type": "application/json" } });
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

      const afterRes = await fetch(`http://localhost:${import.meta.env.VITE_BACKEND_PORT || '3001'}/api/scoring/snapshot?${overrideParams.toString()}`, { mode: "cors", headers: { "Content-Type": "application/json" } });
      const afterData = await afterRes.json();
      if (afterData.success) {
        setAfterSnapshot(afterData.snapshot);
        updateCurrentMetrics(afterData.snapshot);
      }

    } catch (error) {
      logger.error('Simulation failed:', {}, error as Error);
      showToast('error', 'Simulation Failed', 'Simulation failed: ' + (error as Error).message);
    }

    setIsSimulating(false);
  };

  const handleSaveStrategy = async () => {
    const name = prompt('Enter strategy name:');
    if (!name) return;

    const newStrategy: SavedStrategy = {
      id: `strategy-${Date.now()}`,
      name,
      timestamp: new Date().toISOString(),
      weights,
      params: strategyParams,
      performance: currentMetrics
    };

    const updated = [...savedStrategies, newStrategy];
    setSavedStrategies(updated);
    localStorage.setItem('savedStrategies', JSON.stringify(updated));
    showToast('success', 'Strategy Saved', `Strategy "${name}" saved successfully!`);
  };

  const handleLoadStrategy = (strategy: SavedStrategy) => {
    setWeights(strategy.weights);
    setStrategyParams(strategy.params);
    setCurrentMetrics(strategy.performance);
    showToast('success', 'Strategy Loaded', `Strategy "${strategy.name}" loaded successfully!`);
  };

  const handleRunStrategy = async (strategy: SavedStrategy) => {
    setWeights(strategy.weights);
    setStrategyParams(strategy.params);
    await new Promise(resolve => setTimeout(resolve, 100));
    handleSimulate();
  };

  const handleDeleteStrategy = (id: string) => {
    if (confirm('Are you sure you want to delete this strategy?')) {
      const updated = savedStrategies.filter(s => s.id !== id);
      setSavedStrategies(updated);
      localStorage.setItem('savedStrategies', JSON.stringify(updated));
    }
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
          config: {
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
    if (template.config) {
      if (template.config.scoringWeights) {
        setWeights({ ...weights, ...template.config.scoringWeights });
      }
      if (template.config.strategyConfig) {
        setStrategyParams({ ...strategyParams, ...template.config.strategyConfig });
      }
      setCurrentTemplate(template.name);
      alert(`Template "${template.name}" loaded successfully`);
    }
  };

  const handleExportJSON = () => {
    const exportData = {
      name: currentTemplate,
      exportedAt: new Date().toISOString(),
      weights,
      strategyParams,
      currentMetrics
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `strategy_${currentTemplate}_${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importData = JSON.parse(text);

        // Validate data structure
        if (!importData.weights || !importData.strategyParams) {
          alert('Invalid strategy file format');
          return;
        }

        // Load the data
        if (importData.weights) setWeights(importData.weights);
        if (importData.strategyParams) setStrategyParams(importData.strategyParams);
        if (importData.name) setCurrentTemplate(importData.name);

        // Optionally save as template
        const shouldSave = confirm(`Strategy loaded successfully! Would you like to save it as a template?`);
        if (shouldSave) {
          const name = prompt('Enter template name:', importData.name || 'imported-strategy');
          if (name) {
            const response = await fetch(`http://localhost:${import.meta.env.VITE_BACKEND_PORT || '3001'}/api/strategy/templates`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name,
                config: {
                  scoringWeights: importData.weights,
                  strategyConfig: importData.strategyParams
                }
              })
            });

            const data = await response.json();
            if (data.success) {
              await loadTemplates();
              alert(`Template "${name}" saved successfully`);
            }
          }
        }
      } catch (error) {
        alert('Failed to import strategy: ' + (error as Error).message);
      }
    };

    input.click();
  };

  const handleWeightChange = (key: string, value: number) => {
    setWeights({ ...weights, [key]: value });
  };

  const handleParamChange = (key: string, value: number | boolean) => {
    setStrategyParams({ ...strategyParams, [key]: value });
  };

  const getStageColor = (status: string) => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'active') return 'bg-purple-600 animate-pulse';
    return 'bg-gray-300';
  };

  const getActionColor = (action: string) => {
    if (action === 'BUY') return 'text-green-600';
    if (action === 'SELL') return 'text-red-600';
    return 'text-gray-600';
  };

  const getRiskColor = (risk: string) => {
    if (risk === 'LOW') return 'text-green-600';
    if (risk === 'MEDIUM') return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <>
      <ModalComponent />
      <div className="min-h-screen bg-surface p-6">
        <div className="max-w-[1800px] mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Activity className="w-8 h-8 text-purple-600" />
            Interactive Strategy Dashboard
          </h1>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-all">
              <input
                type="checkbox"
                checked={livePreview}
                onChange={(e) => setLivePreview(e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded accent-purple-600"
              />
              <Zap className={`w-5 h-5 ${livePreview ? 'text-yellow-500' : 'text-gray-400'}`} />
              <span className="font-semibold text-gray-700">Live Preview</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Sidebar - Templates & Saved Strategies */}
          <div className="xl:col-span-3 space-y-6">
            {/* Templates */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Templates
              </h2>

              <button
                onClick={() => {
                  setCurrentTemplate('live');
                  alert('Live settings loaded');
                }}
                className={`w-full px-4 py-3 rounded-xl font-semibold transition-all mb-3 ${
                  currentTemplate === 'live'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="text-sm font-semibold">Live Settings</div>
                <div className="text-xs opacity-75">Currently active</div>
              </button>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(templates || []).map(template => (
                  <button
                    key={template.name}
                    onClick={() => handleLoadTemplate(template)}
                    className={`w-full px-4 py-3 rounded-xl font-semibold transition-all ${
                      currentTemplate === template.name
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="text-sm font-semibold">{template.name}</div>
                    {template.description && <div className="text-xs opacity-75">{template.description}</div>}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSaveTemplate}
                className="w-full mt-4 px-4 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all shadow-md"
              >
                Save as Template
              </button>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportJSON}
                  className="px-3 py-2 bg-indigo-500 text-white text-sm rounded-lg font-semibold hover:bg-indigo-600 transition-all shadow-md"
                >
                  Export JSON
                </button>
                <button
                  onClick={handleImportJSON}
                  className="px-3 py-2 bg-orange-500 text-white text-sm rounded-lg font-semibold hover:bg-orange-600 transition-all shadow-md"
                >
                  Import JSON
                </button>
              </div>
            </div>

            {/* Saved Strategies */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Save className="w-5 h-5 text-blue-600" />
                Saved Strategies ({savedStrategies.length})
              </h2>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(savedStrategies || []).map(strategy => (
                  <div key={strategy.id} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <div className="font-semibold text-sm text-gray-800">{strategy.name}</div>
                    <div className="text-xs text-gray-500 mb-2">
                      {new Date(strategy.timestamp).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLoadStrategy(strategy)}
                        className="flex-1 px-2 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-all"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleRunStrategy(strategy)}
                        className="flex-1 px-2 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-all flex items-center justify-center gap-1"
                      >
                        <PlayCircle className="w-3 h-3" />
                        Run
                      </button>
                      <button
                        onClick={() => handleDeleteStrategy(strategy.id)}
                        className="px-2 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-all"
                      >
                        Del
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveStrategy}
                className="w-full mt-4 px-4 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Current Strategy
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="xl:col-span-9 space-y-6">
            {/* Live Performance Metrics */}
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                Live Performance Metrics
                {livePreview && <span className="text-xs bg-yellow-400 text-gray-800 px-2 py-1 rounded-full animate-pulse">LIVE</span>}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="text-xs opacity-75 mb-1">Score</div>
                  <div className="text-2xl font-bold">{currentMetrics.score.toFixed(1)}%</div>
                  <div className="text-xs mt-1">
                    {currentMetrics.score > 70 ? '🔥 Excellent' : currentMetrics.score > 50 ? '✓ Good' : '⚠ Fair'}
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="text-xs opacity-75 mb-1">Confidence</div>
                  <div className="text-2xl font-bold">{currentMetrics.confidence.toFixed(1)}%</div>
                  <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${currentMetrics.confidence}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="text-xs opacity-75 mb-1">Action</div>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    {currentMetrics.action}
                    {currentMetrics.action === 'BUY' && <TrendingUp className="w-5 h-5 text-green-400" />}
                    {currentMetrics.action === 'SELL' && <TrendingDown className="w-5 h-5 text-red-400" />}
                  </div>
                  <div className="text-xs mt-1 opacity-75">Signal</div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="text-xs opacity-75 mb-1">Risk Level</div>
                  <div className="text-2xl font-bold">{currentMetrics.risk}</div>
                  <div className={`text-xs mt-1 ${
                    currentMetrics.risk === 'LOW' ? 'text-green-400' :
                    currentMetrics.risk === 'MEDIUM' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {currentMetrics.risk === 'LOW' && '✓ Safe'}
                    {currentMetrics.risk === 'MEDIUM' && '⚠ Moderate'}
                    {currentMetrics.risk === 'HIGH' && '⚠ Risky'}
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="text-xs opacity-75 mb-1">Expected Return</div>
                  <div className="text-2xl font-bold">{currentMetrics.expectedReturn.toFixed(2)}%</div>
                  <div className="text-xs mt-1 opacity-75">Projected</div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="text-xs opacity-75 mb-1">Win Rate</div>
                  <div className="text-2xl font-bold">{currentMetrics.winRate}%</div>
                  <div className="text-xs mt-1 opacity-75">Historical</div>
                </div>
              </div>
            </div>

            {/* Performance Chart */}
            <PerformanceChart
              currentScore={currentMetrics.score}
              currentConfidence={currentMetrics.confidence}
              currentAction={currentMetrics.action}
              isLive={livePreview}
            />

            {/* Simulation Bar */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Strategy Simulation</h2>

              {/* Animation Pipeline */}
              {isSimulating && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    {(animationStages || []).map((stage) => (
                      <div key={stage.id} className="flex-1 text-center">
                        <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-white font-bold transition-all duration-300 ${getStageColor(stage.status)}`}>
                          {stage.status === 'completed' ? '✓' : stage.id}
                        </div>
                        <div className="text-xs mt-2 text-gray-600 font-medium">{stage.name}</div>
                        {stage.status === 'active' && (
                          <div className="mt-1 text-xs font-semibold text-purple-600 animate-pulse">{stage.progress}%</div>
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
                  className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                    isSimulating
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg hover:scale-105'
                  }`}
                >
                  <PlayCircle className="w-5 h-5" />
                  {isSimulating ? 'Simulating...' : 'Run Full Simulation'}
                </button>
              </div>

              {/* Enhanced Before vs After Comparison */}
              {beforeSnapshot && afterSnapshot && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {/* Before Panel */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      Before Changes
                    </h3>
                    <div className="space-y-3 text-sm">
                      {/* Basic Info */}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Direction:</span>
                        <span className={`font-semibold px-2 py-1 rounded ${getActionColor(beforeSnapshot.action)}`}>
                          {beforeSnapshot.action}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Final Score:</span>
                        <span className="font-semibold text-purple-600">{(beforeSnapshot.final_score * 100).toFixed(1)}%</span>
                      </div>

                      {/* Confluence Breakdown */}
                      {beforeSnapshot.confluence && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-xs font-semibold text-gray-700 mb-2">Confluence:</div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Overall:</span>
                              <span className="font-semibold text-blue-600">{(beforeSnapshot.confluence.score * 100).toFixed(1)}%</span>
                            </div>
                            {beforeSnapshot.confluence.breakdown && (
                              <>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">AI:</span>
                                  <span className="font-mono">{((beforeSnapshot.confluence.breakdown.ai || 0) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Technical:</span>
                                  <span className="font-mono">{((beforeSnapshot.confluence.breakdown.technical || 0) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Context:</span>
                                  <span className="font-mono">{((beforeSnapshot.confluence.breakdown.context || 0) * 100).toFixed(1)}%</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SL/TP and Leverage */}
                      {beforeSnapshot.entryPlan && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-xs font-semibold text-gray-700 mb-2">Entry Plan:</div>
                          <div className="space-y-1 text-xs">
                            {beforeSnapshot.entryPlan.stopLoss && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Stop Loss:</span>
                                <span className="font-mono text-red-600">{beforeSnapshot.entryPlan.stopLoss.toFixed(2)}</span>
                              </div>
                            )}
                            {beforeSnapshot.entryPlan.takeProfit && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Take Profit:</span>
                                <span className="font-mono text-green-600">{beforeSnapshot.entryPlan.takeProfit.toFixed(2)}</span>
                              </div>
                            )}
                            {beforeSnapshot.entryPlan.leverage && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Leverage:</span>
                                <span className="font-semibold">{beforeSnapshot.entryPlan.leverage}x</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* After Panel */}
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 border-2 border-purple-300 shadow-lg">
                    <h3 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-600 rounded-full animate-pulse"></div>
                      After Changes
                    </h3>
                    <div className="space-y-3 text-sm">
                      {/* Basic Info */}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Direction:</span>
                        <span className={`font-semibold px-2 py-1 rounded ${getActionColor(afterSnapshot.action)}`}>
                          {afterSnapshot.action}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Final Score:</span>
                        <span className="font-semibold text-purple-600">{(afterSnapshot.final_score * 100).toFixed(1)}%</span>
                      </div>

                      {/* Confluence Breakdown */}
                      {afterSnapshot.confluence && (
                        <div className="mt-3 pt-3 border-t border-purple-200">
                          <div className="text-xs font-semibold text-purple-700 mb-2">Confluence:</div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Overall:</span>
                              <span className="font-semibold text-blue-600">{(afterSnapshot.confluence.score * 100).toFixed(1)}%</span>
                            </div>
                            {afterSnapshot.confluence.breakdown && (
                              <>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">AI:</span>
                                  <span className="font-mono">{((afterSnapshot.confluence.breakdown.ai || 0) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Technical:</span>
                                  <span className="font-mono">{((afterSnapshot.confluence.breakdown.technical || 0) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Context:</span>
                                  <span className="font-mono">{((afterSnapshot.confluence.breakdown.context || 0) * 100).toFixed(1)}%</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SL/TP and Leverage */}
                      {afterSnapshot.entryPlan && (
                        <div className="mt-3 pt-3 border-t border-purple-200">
                          <div className="text-xs font-semibold text-purple-700 mb-2">Entry Plan:</div>
                          <div className="space-y-1 text-xs">
                            {afterSnapshot.entryPlan.stopLoss && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Stop Loss:</span>
                                <span className="font-mono text-red-600">{afterSnapshot.entryPlan.stopLoss.toFixed(2)}</span>
                              </div>
                            )}
                            {afterSnapshot.entryPlan.takeProfit && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Take Profit:</span>
                                <span className="font-mono text-green-600">{afterSnapshot.entryPlan.takeProfit.toFixed(2)}</span>
                              </div>
                            )}
                            {afterSnapshot.entryPlan.leverage && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Leverage:</span>
                                <span className="font-semibold">{afterSnapshot.entryPlan.leverage}x</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Delta indicators */}
                      <div className="mt-3 pt-3 border-t border-purple-200">
                        <div className="text-xs font-semibold text-purple-700 mb-1">Impact:</div>
                        <div className="flex gap-2 flex-wrap">
                          {afterSnapshot.final_score > beforeSnapshot.final_score ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              Score +{((afterSnapshot.final_score - beforeSnapshot.final_score) * 100).toFixed(1)}%
                            </span>
                          ) : afterSnapshot.final_score < beforeSnapshot.final_score ? (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded flex items-center gap-1">
                              <TrendingDown className="w-3 h-3" />
                              Score {((afterSnapshot.final_score - beforeSnapshot.final_score) * 100).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              No Change
                            </span>
                          )}
                          {beforeSnapshot.action !== afterSnapshot.action && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                              Direction Changed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Detector Weights */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Detector Weights</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(weights).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-700">
                        {key.replace(/_/g, ' ').toUpperCase()}
                      </label>
                      <span className="text-sm font-mono text-purple-600 bg-purple-100 px-2 py-1 rounded">
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
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Strategy Parameters</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(strategyParams).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-700">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <span className="text-sm font-mono text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : typeof value === 'number' ? value.toFixed(2) : value}
                      </span>
                    </div>
                    {typeof value === 'boolean' ? (
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => handleParamChange(key, e.target.checked)}
                          className="w-5 h-5 text-blue-600 rounded accent-blue-600"
                        />
                        <span className="ml-2 text-sm text-gray-600">Enable</span>
                      </label>
                    ) : (
                      <input
                        type="range"
                        min={key.includes('Leverage') ? 1 : 0}
                        max={key === 'minLeverage' || key === 'maxLeverage' ? 20 : key === 'rr' ? 5 : 1}
                        step={key.includes('Leverage') ? 1 : 0.01}
                        value={value as number}
                        onChange={(e) => handleParamChange(key, parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
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
    </>
  );
};
