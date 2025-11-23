import React, { useState } from 'react';
import { Logger } from './core/Logger.js';
import { NavigationProvider, useNavigation } from './components/Navigation/NavigationProvider';
import { ThemeProvider } from './components/Theme/ThemeProvider';
import { AccessibilityProvider } from './components/Accessibility/AccessibilityProvider';
import { LiveDataProvider } from './components/LiveDataContext';
import { RealDataProvider } from './components/connectors/RealDataConnector';
import { DataProvider } from './contexts/DataContext';
import { TradingProvider } from './contexts/TradingContext';
import { ModeProvider } from './contexts/ModeContext';
import { BacktestProvider } from './contexts/BacktestContext';
import { Sidebar } from './components/Navigation/Sidebar';
import { lazyLoad } from './components/lazyLoad';
import LoadingSpinner from './components/ui/LoadingSpinner';
import LoadingScreen from './components/ui/LoadingScreen';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { getViewTheme } from './config/viewThemes';
import StatusRibbon from './components/ui/StatusRibbon';
import { ToastContainer } from './components/ui/Toast';

const DashboardView = lazyLoad(() => import('./views/DashboardView'), 'DashboardView');
const ChartingView = lazyLoad(() => import('./views/ChartingView'), 'ChartingView');
const MarketView = lazyLoad(() => import('./views/MarketView'), 'MarketView');
const ScannerView = lazyLoad(() => import('./views/ScannerView'), 'ScannerView');
const TrainingView = lazyLoad(() => import('./views/TrainingView'), 'TrainingView');
const RiskView = lazyLoad(() => import('./views/RiskView'), 'RiskView');
const ProfessionalRiskView = lazyLoad(() => import('./views/ProfessionalRiskView')
  .then(m => ({ default: m.ProfessionalRiskView }))
  .catch(err => {
    console.warn("ProfessionalRiskView load error:", err);
    return { default: () => <div className="p-4 text-red-500">Error loading Professional Risk View</div> };
  }), 'ProfessionalRiskView');
const BacktestView = lazyLoad(() => import('./views/BacktestView'), 'BacktestView');
const HealthView = lazyLoad(() => import('./views/HealthView'), 'HealthView');
const SettingsView = lazyLoad(() => import('./views/SettingsView'), 'SettingsView');
const FuturesTradingView = lazyLoad(() => import('./views/FuturesTradingView')
  .then(m => ({ default: m.FuturesTradingView }))
  .catch(err => {
    console.warn("FuturesTradingView load error:", err);
    return { default: () => <div className="p-4 text-red-500">Error loading Futures Trading View</div> };
  }), 'FuturesTradingView');
const TradingView = lazyLoad(() => import('./views/TradingView'), 'TradingView');
const UnifiedTradingView = lazyLoad(() => import('./views/UnifiedTradingView'), 'UnifiedTradingView');
const EnhancedTradingView = lazyLoad(() => import('./views/EnhancedTradingView'), 'EnhancedTradingView');
const PositionsView = lazyLoad(() => import('./views/PositionsView')
  .then(m => ({ default: m.PositionsView }))
  .catch(err => {
    console.warn("PositionsView load error:", err);
    return { default: () => <div className="p-4 text-red-500">Error loading Positions View</div> };
  }), 'PositionsView');
const PortfolioPage = lazyLoad(() => import('./views/PortfolioPage')
  .then(m => ({ default: m.PortfolioPage }))
  .catch(err => {
    console.warn("PortfolioPage load error:", err);
    return { default: () => <div className="p-4 text-red-500">Error loading Portfolio Page</div> };
  }), 'PortfolioPage');
const StrategyLabView = lazyLoad(() => import('./views/EnhancedStrategyLabView')
  .then(m => ({ default: m.EnhancedStrategyLabView }))
  .catch(err => {
    console.warn("StrategyLabView load error:", err);
    return { default: () => <div className="p-4 text-red-500">Error loading Strategy Lab View</div> };
  }), 'EnhancedStrategyLabView');
const StrategyBuilderView = lazyLoad(() => import('./views/StrategyBuilderView'), 'StrategyBuilderView');
const StrategyInsightsView = lazyLoad(() => import('./views/StrategyInsightsView'), 'StrategyInsightsView');
const ExchangeSettingsView = lazyLoad(() => import('./views/ExchangeSettingsView'), 'ExchangeSettingsView');
const MonitoringView = lazyLoad(() => import('./views/MonitoringView'), 'MonitoringView');

const MONITORING_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_MONITORING_VIEW === 'true';

const AppContent: React.FC = () => {
  const navigationContext = useNavigation();
  if (!navigationContext) {
    return <div>Loading...</div>;
  }
  const { currentView } = navigationContext;
  const viewTheme = getViewTheme(currentView);
  const logger = Logger.getInstance();

  // Prefetch critical views for better user experience
  React.useEffect(() => {
    // Prefetch dashboard and charting views which are most commonly used
    import('./views/DashboardView').catch((err) => {
      logger.error('Failed to prefetch DashboardView:', {}, err);
    });
    import('./views/ChartingView').catch((err) => {
      logger.error('Failed to prefetch ChartingView:', {}, err);
    });
    // Skip MarketView prefetch to avoid potential import issues - let lazy load handle it
  }, []);

  const renderCurrentView = () => {
    const ViewComponent = (() => {
      switch (currentView) {
        case 'dashboard': return <DashboardView />;
        case 'charting': return <ChartingView />;
        case 'market': return <MarketView />;
        case 'scanner': return <ScannerView />;
        case 'training': return <TrainingView />;
        case 'risk': return <RiskView />;
        case 'professional-risk': return <ProfessionalRiskView />;
        case 'backtest': return <BacktestView />;
        case 'strategyBuilder': return <StrategyBuilderView />;
        case 'health': return <HealthView />;
        case 'settings': return <SettingsView />;
        case 'futures': return <FuturesTradingView />;
        case 'trading': return <UnifiedTradingView />;
        case 'portfolio': return <PortfolioPage />;
        case 'enhanced-trading': return <EnhancedTradingView />;
        case 'positions': return <PositionsView />;
        case 'strategylab': return <StrategyLabView />;
        case 'strategy-insights': return <StrategyInsightsView />;
        case 'exchange-settings': return <ExchangeSettingsView />;
        case 'monitoring': return MONITORING_ENABLED ? <MonitoringView /> : <DashboardView />;
        default: return <DashboardView />;
      }
    })();
    
    return (
      <ErrorBoundary>
        {ViewComponent}
      </ErrorBoundary>
    );
  };

  return (
      <div
        className="min-h-screen flex flex-col lg:flex-row transition-colors duration-700 relative overflow-hidden"
        style={{
          background: '#FFFFFF',
        }}
      >
        {/* Purple halo effects removed - background is now white */}
        
        <main className="flex-1 overflow-auto px-6 py-4 lg:p-8 max-w-[1600px] w-full mx-auto relative z-10 lg:mr-[280px]">
          <div className="sticky top-0 z-30 -mx-6 lg:-mx-8 px-6 lg:px-8 mb-6 bg-white/95 backdrop-blur-sm pb-4">
            <StatusRibbon />
          </div>
          <div className="mt-6">
            {renderCurrentView()}
          </div>
      </main>
      <Sidebar />
    </div>
  );
};

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAppReady, setIsAppReady] = useState(false);

  React.useEffect(() => {
    // Simulate app initialization
    const initializeApp = async () => {
      try {
        // تنظیم Hugging Face به عنوان منبع داده پیش‌فرض
        const { setPrimaryDataSourceOverride } = await import('./config/dataSource');
        setPrimaryDataSourceOverride('huggingface');
        Logger.getInstance().info('Primary data source set to Hugging Face');

        // Give enough time for providers to initialize
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mark app as ready
        setIsAppReady(true);
      } catch (error) {
        Logger.getInstance().error('Error during app initialization:', {}, error);
        // Still show the app even if initialization has issues
        setIsAppReady(true);
      }
    };

    initializeApp();
  }, []);

  // Show loading screen during initialization
  if (!isAppReady) {
    return (
      <ModeProvider>
        <ThemeProvider>
          <LoadingScreen message="Initializing trading platform" showProgress />
        </ThemeProvider>
      </ModeProvider>
    );
  }

  return (
    <ModeProvider>
      <ThemeProvider>
        <AccessibilityProvider>
          <DataProvider>
            <RealDataProvider>
              <LiveDataProvider>
                <TradingProvider>
                  <BacktestProvider>
                    <NavigationProvider>
                      <AppContent />
                      <ToastContainer />
                    </NavigationProvider>
                  </BacktestProvider>
                </TradingProvider>
              </LiveDataProvider>
            </RealDataProvider>
          </DataProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </ModeProvider>
  );
}

export default App;