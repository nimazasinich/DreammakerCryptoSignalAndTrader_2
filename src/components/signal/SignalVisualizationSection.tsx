// SignalVisualizationSection.tsx - Main integration component for signal visualization
import React, { useState, useEffect } from 'react';
import { Logger } from '../../core/Logger';
import { SignalStagePipeline, StageData } from './SignalStagePipeline';
import { SignalExamplesPanel } from './SignalExamplesPanel';
import { ControlsPanel } from './ControlsPanel';
import { useSignalWebSocket } from '../../hooks/useSignalWebSocket';
import { OverlayConfig, TechnicalData } from '../charts/ChartOverlay';
import { showToast } from '../ui/Toast';
import { useConfirmModal } from '../ui/ConfirmModal';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SignalVisualizationSectionProps {
  symbol: string;
  timeframe: string;
  chartData: CandleData[];
  onSymbolChange: (symbol: string) => void;
  onTimeframeChange: (timeframe: string) => void;
  onRefresh: () => void;
}


const logger = Logger.getInstance();

export const SignalVisualizationSection: React.FC<SignalVisualizationSectionProps> = ({
  symbol,
  timeframe,
  chartData,
  onSymbolChange,
  onTimeframeChange,
  onRefresh
}) => {
  const { confirm, ModalComponent } = useConfirmModal();
  const { stages, isConnected, error: wsError, signalData } = useSignalWebSocket(symbol, true);
  const [overlayConfig, setOverlayConfig] = useState<OverlayConfig>({
    showSupportResistance: true,
    showOrderBlocks: true,
    showFibonacci: false,
    showElliottWaves: false,
    showHarmonicPatterns: false,
    showEntryExit: true
  });
  
  const [technicalData, setTechnicalData] = useState<TechnicalData | null>(null);
  const [showExamples, setShowExamples] = useState(false);

  // Transform signal data to technical data for chart overlay
  useEffect(() => {
    if (signalData?.technicals) {
      setTechnicalData({
        support: signalData.technicals.support,
        resistance: signalData.technicals.resistance,
        orderBlocks: signalData.technicals.orderBlocks?.map(ob => ({
          price: ob.price,
          type: ob.type as 'bullish' | 'bearish',
          strength: ob.strength,
          time: Date.now() // Approximate, should come from signalData
        })),
        fibonacci: signalData.technicals.fibonacci ? {
          levels: signalData.technicals.fibonacci.levels || [],
          start: (chartData?.length || 0) > 0 ? Math.min(...(chartData || []).map(d => d.low)) : 0,
          end: (chartData?.length || 0) > 0 ? Math.max(...(chartData || []).map(d => d.high)) : 0
        } : undefined,
        entryExit: signalData.decision ? {
          entry: signalData.decision.signal !== 'HOLD' ? {
            price: signalData.price,
            time: Date.now(),
            type: signalData.decision.signal === 'LONG' ? 'LONG' : 'SHORT'
          } : undefined
        } : undefined
      });
    }
  }, [signalData, chartData]);

  const handleScreenshot = async () => {
    try {
      // Use html2canvas or similar library to capture the chart
      // For now, we'll use a simple canvas capture
      const chartElement = document.querySelector('.chart-container');
      if (!chartElement) {
        logger.warn('Chart element not found');
        return;
      }

      // Try to use html2canvas if available, otherwise fallback
      if (typeof window !== 'undefined' && (window as any).html2canvas) {
        const canvas = await (window as any).html2canvas(chartElement);
        const dataUrl = canvas.toDataURL('image/png');
        
        // Create download link
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `chart-${symbol}-${Date.now()}.png`;
        link.click();
      } else {
        logger.info('Screenshot: html2canvas not available, using fallback');
        // Fallback: Just log for now
        showToast('warning', 'Library Missing', 'Screenshot feature requires html2canvas library. Please install it.');
      }
    } catch (error) {
      logger.error('Screenshot failed:', {}, error);
      showToast('error', 'Screenshot Failed', 'Failed to capture screenshot');
    }
  };

  const handleExport = () => {
    if (signalData) {
      const dataStr = JSON.stringify(signalData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `signal-${symbol}-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handlePlaySimulation = () => {
    // Implement simulation playback - replay signal generation stages
    logger.info('Starting signal generation simulation...');

    // This would trigger a replay of the 8-stage process
    // For now, we'll just log the action
    // In a full implementation, this would:
    // 1. Reset all stages to idle
    // 2. Sequentially activate each stage with delays
    // 3. Show data flowing through the pipeline
    // 4. Display the final decision

    showToast('info', 'Simulation Mode', 'This feature will replay the signal generation process step-by-step. Implementation in progress.');
  };

  return (
    <>
      <ModalComponent />
      <div className="space-y-6" role="region" aria-label="Signal Visualization Dashboard">
        {/* Connection Status */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg bg-slate-800/50 gap-3">
          <div className="flex items-center gap-2">
            <div 
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}
              role="status"
              aria-label={isConnected ? 'Connected to signal stream' : 'Disconnected from signal stream'}
            />
            <span className="text-sm text-slate-300">
              {isConnected ? 'Connected to Signal Stream' : 'Disconnected'}
            </span>
            {wsError && (
              <span className="text-xs text-red-400" role="alert">
                ({wsError})
              </span>
            )}
          </div>
          <button
            onClick={() => setShowExamples(!showExamples)}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-expanded={showExamples}
            aria-controls="examples-panel"
          >
            {showExamples ? 'Hide Examples' : 'Show Examples'}
          </button>
        </div>

      {/* Main Layout - Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Stage Pipeline - Left Side */}
        <div className="lg:col-span-1 order-1 lg:order-1">
          <div className="lg:sticky lg:top-4">
            <div 
              className="p-4 rounded-xl bg-slate-800/50 border border-slate-700"
              role="complementary"
              aria-label="Signal Processing Pipeline"
            >
              <h3 className="text-lg font-bold text-white mb-4" id="pipeline-heading">
                Signal Pipeline
              </h3>
              <SignalStagePipeline
                stages={stages}
                currentStage={stages.find(s => s.status === 'active')?.stage}
                onStageClick={(stage) => logger.info('Stage clicked:', { data: stage })}
              />
            </div>
          </div>
        </div>

        {/* Chart Area - Center */}
        <div className="lg:col-span-2 order-2 lg:order-2">
          <div 
            className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 chart-container"
            role="main"
            aria-label="Trading Chart with Technical Overlays"
          >
            {/* Chart will be rendered by parent component with technicals */}
            <div className="text-sm text-slate-400 mb-2">
              <p className="mb-2">📊 Live Chart Visualization</p>
              <p className="text-xs text-slate-500">
                Technical overlays and signal markers are displayed on the main chart above.
                Use the controls panel to toggle different overlay types.
              </p>
            </div>
          </div>
        </div>

        {/* Controls Panel - Right Side */}
        <div className="lg:col-span-1 order-3 lg:order-3">
          <div className="lg:sticky lg:top-4">
            <div role="complementary" aria-label="Chart Controls">
              <ControlsPanel
                overlayConfig={overlayConfig}
                onConfigChange={setOverlayConfig}
                timeframe={timeframe}
                onTimeframeChange={onTimeframeChange}
                symbol={symbol}
                onSymbolChange={onSymbolChange}
                onRefresh={onRefresh}
                onScreenshot={handleScreenshot}
                onExport={handleExport}
                onPlaySimulation={handlePlaySimulation}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Examples Panel */}
      {showExamples && (
        <div 
          id="examples-panel"
          className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 animate-fade-in"
          role="region"
          aria-label="Signal Examples"
        >
          <SignalExamplesPanel
            onExampleClick={(example) => {
              logger.info('Example clicked:', { data: example });
              // Could open a modal or update chart with example data
            }}
          />
        </div>
      )}
      </div>
    </>
  );
};

