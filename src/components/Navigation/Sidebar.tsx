import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Home,
  Layers,
  Search,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
  Rocket,
  ListOrdered,
  AlertCircle,
  Star,
  Moon,
  Sun,
  Gamepad2,
} from 'lucide-react';
import { useNavigation, NavigationView } from './NavigationProvider';
import { t } from '../../i18n';
import { Logger } from '../../core/Logger';
import { SidebarErrorBoundary } from './SidebarErrorBoundary';

interface NavigationItem {
  id: NavigationView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  category?: 'main' | 'trading' | 'analysis' | 'settings';
  tooltip?: string;
  isNew?: boolean;
  isPro?: boolean;
}

interface SidebarProps {
  className?: string;
  onNavigate?: (view: NavigationView) => void;
  defaultCollapsed?: boolean;
}

const logger = Logger.getInstance();

const SHOW_MONITORING = import.meta.env.DEV || import.meta.env.VITE_ENABLE_MONITORING_VIEW === 'true';

// دسته‌بندی آیتم‌های منو
const NAV_ITEMS: NavigationItem[] = [
  // Main
  { id: 'dashboard', label: t('navigation.dashboard'), icon: Home, category: 'main', tooltip: 'Main dashboard overview' },
  { id: 'charting', label: t('navigation.charting'), icon: TrendingUp, category: 'main', tooltip: 'Advanced charting tools' },
  { id: 'market', label: t('navigation.market'), icon: Zap, category: 'main', tooltip: 'Market overview and trends' },
  { id: 'scanner', label: t('navigation.scanner'), icon: Search, category: 'main', tooltip: 'Market scanner and filters' },
  
  // Trading
  { id: 'trading', label: t('navigation.trading'), icon: Sparkles, category: 'trading', tooltip: 'Trading interface' },
  { id: 'enhanced-trading', label: 'Enhanced Trading', icon: Rocket, category: 'trading', tooltip: 'Advanced trading features', isNew: true },
  { id: 'positions', label: 'Positions', icon: ListOrdered, category: 'trading', tooltip: 'Your open positions' },
  { id: 'futures', label: t('navigation.futures'), icon: DollarSign, category: 'trading', tooltip: 'Futures trading' },
  { id: 'portfolio', label: 'Portfolio', icon: Wallet, category: 'trading', tooltip: 'Portfolio management' },
  
  // Analysis
  { id: 'training', label: t('navigation.training'), icon: Brain, category: 'analysis', tooltip: 'AI training and models' },
  { id: 'risk', label: t('navigation.risk'), icon: Shield, category: 'analysis', tooltip: 'Risk management' },
  { id: 'professional-risk', label: 'Pro Risk', icon: AlertTriangle, category: 'analysis', tooltip: 'Professional risk analysis', isPro: true },
  { id: 'backtest', label: t('navigation.backtest'), icon: BarChart3, category: 'analysis', tooltip: 'Strategy backtesting' },
  { id: 'strategyBuilder', label: 'Strategy Builder', icon: Sliders, category: 'analysis', tooltip: 'Build custom strategies' },
  { id: 'strategylab', label: 'Strategy Lab', icon: Activity, category: 'analysis', tooltip: 'Strategy laboratory' },
  { id: 'strategy-insights', label: 'Strategy Insights', icon: Layers, category: 'analysis', tooltip: 'Strategy analytics' },
  
  // Settings
  { id: 'health', label: t('navigation.health'), icon: Activity, category: 'settings', tooltip: 'System health check' },
  { id: 'settings', label: t('navigation.settings'), icon: Settings, category: 'settings', tooltip: 'Application settings' },
  { id: 'exchange-settings', label: 'Exchange Settings', icon: Settings, category: 'settings', tooltip: 'Exchange configuration' },
  
  ...(SHOW_MONITORING ? [{ 
    id: 'monitoring' as NavigationView, 
    label: 'Monitoring', 
    icon: Activity, 
    category: 'settings' as const,
    tooltip: 'System monitoring',
    badge: 'DEV'
  }] : []),
];

const SidebarContent: React.FC<SidebarProps> = ({ 
  className = '', 
  onNavigate,
  defaultCollapsed = false 
}) => {
  const navigationContext = useNavigation();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [hoveredItem, setHoveredItem] = useState<NavigationView | null>(null);
  const [error, setError] = useState<string | null>(null);

  // کنترل خطا برای navigation context
  const currentView = useMemo(() => {
    try {
      return navigationContext?.currentView || 'dashboard';
    } catch (err) {
      logger.error('Error accessing currentView', {}, err as Error);
      setError('Navigation error');
      return 'dashboard';
    }
  }, [navigationContext]);

  const setCurrentView = useCallback((view: NavigationView) => {
    try {
      if (!navigationContext?.setCurrentView) {
        throw new Error('Navigation context not available');
      }
      navigationContext.setCurrentView(view);
      onNavigate?.(view);
      logger.debug('Navigation changed', { view });
    } catch (err) {
      logger.error('Error setting view', { view }, err as Error);
      setError('Failed to navigate');
    }
  }, [navigationContext, onNavigate]);

  // ذخیره وضعیت collapsed در localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved !== null) {
        setCollapsed(JSON.parse(saved));
      }
    } catch (err) {
      logger.warn('Failed to load sidebar state', {}, err as Error);
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    try {
      setCollapsed(prev => {
        const newState = !prev;
        localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
        return newState;
      });
    } catch (err) {
      logger.error('Error toggling sidebar', {}, err as Error);
    }
  }, []);

  // گروه‌بندی آیتم‌ها بر اساس دسته
  const groupedItems = useMemo(() => {
    try {
      return NAV_ITEMS.reduce((acc, item) => {
        const category = item.category || 'main';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {} as Record<string, NavigationItem[]>);
    } catch (err) {
      logger.error('Error grouping nav items', {}, err as Error);
      return { main: NAV_ITEMS };
    }
  }, []);

  const categoryLabels: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    main: { label: 'Main', icon: BarChart3 },
    trading: { label: 'Trading', icon: DollarSign },
    analysis: { label: 'Analysis', icon: TrendingUp },
    settings: { label: 'Settings', icon: Settings },
  };

  return (
    <aside
      className={`bg-white border-t border-gray-200 lg:border-t-0 lg:border-r shadow-lg flex-shrink-0 transition-all duration-500 lg:h-screen lg:fixed lg:right-0 lg:top-0 lg:bottom-0 relative overflow-hidden flex flex-col ${
        collapsed ? 'w-20' : 'w-full lg:w-[280px]'
      } ${className}`}
      role="navigation"
      aria-label="Main navigation"
      dir="rtl"
      style={{ backgroundColor: '#FFFFFF', height: '100vh' }}
    >
      {/* Purple halo effects removed - white background */}
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-200 relative z-10 flex-shrink-0 bg-white">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 border border-gray-300 text-gray-700 transition-all duration-300 hover:shadow-md hover:scale-110 hover:border-gray-400 flex-shrink-0"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {!collapsed && (
            <div className="min-w-0 flex-1 text-left">
              <p className="text-base font-bold uppercase tracking-wide text-gray-900 flex items-center justify-start gap-2 truncate">
                Bolt AI
                <Zap className="h-4 w-4 animate-pulse" />
              </p>
              <p className="text-xs text-gray-600 font-medium truncate text-left">
                {t('layout.sidebarTagline') || 'Trading Platform'}
              </p>
            </div>
          )}
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-md animate-float flex-shrink-0">
            <Zap className="h-6 w-6" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && !collapsed && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-xl glass border border-red-400/40 bg-red-500/10 relative z-10 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-xs text-red-700 font-medium text-left">{error}</p>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent bg-white">
        <div className="px-3 py-4 space-y-4">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="space-y-1.5">
              {/* Category Label */}
              {!collapsed && items.length > 0 && (
                <div className="px-2 mb-2">
                  {(() => {
                    const categoryInfo = categoryLabels[category] || { label: category, icon: BarChart3 };
                    const CategoryIcon = categoryInfo.icon;
                    return (
                      <p className="text-[9px] uppercase tracking-wider font-bold text-gray-500 flex items-center gap-1.5">
                        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                        <span className="flex items-center gap-1">
                          <CategoryIcon className="h-2.5 w-2.5" />
                          {categoryInfo.label}
                        </span>
                        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                      </p>
                    );
                  })()}
                </div>
              )}

              {/* Navigation Items */}
              <ul className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  const isHovered = hoveredItem === item.id;

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setCurrentView(item.id)}
                        onMouseEnter={() => setHoveredItem(item.id)}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-300 relative overflow-hidden flex-row-reverse ${
                          isActive
                            ? 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-md scale-[1.01] border border-gray-700'
                            : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:via-white hover:to-gray-50 hover:shadow-sm hover:scale-[1.005] border border-transparent hover:border-gray-200'
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                        title={collapsed ? item.label : item.tooltip}
                      >
                        {/* افکت درخشش */}
                        {isActive && (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-400/20 via-white/10 to-gray-400/20 rounded-2xl blur-sm opacity-50" />
                          </>
                        )}
                        {/* Hover glow effect */}
                        {!isActive && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-100/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                        )}
                        
                        {/* Label & Badges */}
                        {!collapsed && (
                          <span className="relative z-10 flex items-center gap-2 min-w-0 flex-1 justify-start text-left">
                            <span className="truncate">{item.label}</span>
                            
                            {/* New Badge */}
                            {item.isNew && (
                              <span className="px-1.5 py-0.5 rounded-full bg-green-500 text-white text-[9px] font-bold uppercase animate-pulse flex-shrink-0">
                                New
                              </span>
                            )}
                            
                            {/* Pro Badge */}
                            {item.isPro && (
                              <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[9px] font-bold uppercase shadow-lg flex-shrink-0">
                                Pro
                              </span>
                            )}
                            
                            {/* Custom Badge */}
                            {item.badge && (
                              <span className="px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-700 text-[9px] font-bold uppercase flex-shrink-0">
                                {item.badge}
                              </span>
                            )}
                            
                            {/* Active Sparkle */}
                            {isActive && <Sparkles className="h-3 w-3 animate-pulse flex-shrink-0" />}
                          </span>
                        )}
                        
                        {/* آیکون */}
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-all duration-300 relative z-10 flex-shrink-0 ${
                            isActive
                              ? 'bg-gradient-to-br from-white/30 to-white/10 text-white shadow-md border border-white/20 group-hover:scale-105'
                              : 'bg-gradient-to-br from-gray-50 to-white border border-gray-200 text-gray-600 group-hover:border-gray-300 group-hover:shadow-sm group-hover:scale-105 group-hover:bg-gradient-to-br group-hover:from-gray-100 group-hover:to-white'
                          }`}
                        >
                          <Icon className={`h-4 w-4 transition-transform duration-300 ${isActive ? 'drop-shadow-md' : 'group-hover:scale-110'}`} aria-hidden="true" />
                        </span>
                        
                        {/* نقطه فعال */}
                        {isActive && !collapsed && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse flex-shrink-0" />
                        )}

                        {/* Tooltip برای حالت collapsed */}
                        {collapsed && isHovered && (
                          <div className="absolute right-full mr-2 px-3 py-2 rounded-xl bg-white border border-gray-300 shadow-lg whitespace-nowrap z-50 animate-fade-in text-left">
                            <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                            {item.tooltip && (
                              <p className="text-xs text-gray-600 mt-0.5">{item.tooltip}</p>
                            )}
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer - Minimal Version Info Only */}
      <div className="border-t border-gray-200 px-5 py-3 text-xs relative z-10 flex-shrink-0 bg-white">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 font-medium">v1.0.0</span>
            <span className="text-[10px] text-gray-500 font-medium">© 2024</span>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 opacity-50" />
          </div>
        )}
      </div>
    </aside>
  );
};

// Export با ErrorBoundary
export const Sidebar: React.FC<SidebarProps> = (props) => {
  return (
    <SidebarErrorBoundary>
      <SidebarContent {...props} />
    </SidebarErrorBoundary>
  );
};

export default Sidebar;