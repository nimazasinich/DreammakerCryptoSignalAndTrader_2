import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BacktestContextType {
  symbolParam: string | null;
  timeframe: string | null;
  setBacktestParams: (params: { symbolParam: string; timeframe: string }) => void;
  clearBacktestParams: () => void;
}

const BacktestContext = createContext<BacktestContextType | undefined>(undefined);

interface BacktestProviderProps {
  children: ReactNode;
}

export const BacktestProvider: React.FC<BacktestProviderProps> = ({ children }) => {
  const [symbolParam, setSymbolParam] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<string | null>(null);

  const setBacktestParams = ({ symbolParam, timeframe }: { symbolParam: string; timeframe: string }) => {
    setSymbolParam(symbolParam);
    setTimeframe(timeframe);
  };

  const clearBacktestParams = () => {
    setSymbolParam(null);
    setTimeframe(null);
  };

  return (
    <BacktestContext.Provider
      value={{
        symbolParam,
        timeframe,
        setBacktestParams,
        clearBacktestParams,
      }}
    >
      {children}
    </BacktestContext.Provider>
  );
};

export const useBacktestContext = () => {
  const context = useContext(BacktestContext);
  if (context === undefined) {
    console.error('useBacktestContext must be used within a BacktestProvider');
  }
  return context;
};
