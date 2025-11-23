import React, { createContext, useContext, useState, ReactNode } from 'react';

export type NavigationView =
  | 'dashboard'
  | 'charting'
  | 'market'
  | 'scanner'
  | 'futures'
  | 'trading'
  | 'portfolio'
  | 'training'
  | 'risk'
  | 'professional-risk'
  | 'backtest'
  | 'strategyBuilder'
  | 'health'
  | 'settings'
  | 'enhanced-trading'
  | 'positions'
  | 'strategylab'
  | 'strategy-insights'
  | 'exchange-settings'
  | 'monitoring';

interface NavigationContextType {
  currentView: NavigationView;
  setCurrentView: (view: NavigationView) => void;
  navigationHistory: NavigationView[];
  goBack: () => void;
  canGoBack: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [currentView, setCurrentViewState] = useState<NavigationView>('dashboard');
  const [navigationHistory, setNavigationHistory] = useState<NavigationView[]>(['dashboard']);

  const setCurrentView = (view: NavigationView) => {
    if (view !== currentView) {
      // Limit history to prevent memory growth (keep last 50 entries)
      setNavigationHistory(prev => {
        const newHistory = [...prev, view];
        return newHistory.slice(-50);
      });
      setCurrentViewState(view);
    }
  };

  const goBack = () => {
    if ((navigationHistory?.length || 0) > 1) {
      const newHistory = navigationHistory.slice(0, -1);
      const previousView = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setCurrentViewState(previousView);
    }
  };

  const canGoBack = (navigationHistory?.length || 0) > 1;

  return (
    <NavigationContext.Provider value={{
      currentView,
      setCurrentView,
      navigationHistory,
      goBack,
      canGoBack
    }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    console.error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};