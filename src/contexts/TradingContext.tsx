import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { KuCoinFuturesService } from '../services/KuCoinFuturesService';
import { VirtualTradingService } from '../services/VirtualTradingService';
import { Logger } from '../core/Logger';
import { useMode } from './ModeContext';
import { TradingMode } from '../types/modes';

const logger = Logger.getInstance();

interface TradingContextType {
  tradingMode: TradingMode;
  setMode: (m: TradingMode) => void;
  balance: number;
  positions: any[];
  orders: any[];
  placeOrder: (order: any) => Promise<any>;
  closePosition: (symbol: string) => Promise<any>;
  cancelOrder: (orderId: string) => Promise<any>;
  refreshData: () => Promise<void>;
  isLoading: boolean;
  // Legacy compatibility
  isVirtual: boolean;
  toggleMode: () => void;
}

const TradingContext = createContext<TradingContextType | null>(null);

export const TradingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { state, setTradingMode } = useMode();
  const tradingMode = state.tradingMode;
  const isVirtual = tradingMode === 'virtual';

  const [balance, setBalance] = useState(100000);
  const [positions, setPositions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const kucoinService = KuCoinFuturesService.getInstance();
  const virtualService = VirtualTradingService.getInstance();

  useEffect(() => {
    refreshData();
  }, [tradingMode]);

  const setMode = (m: TradingMode) => {
    setTradingMode(m);
  };

  const toggleMode = () => {
    setTradingMode(isVirtual ? 'real' : 'virtual');
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      if (isVirtual) {
        const data = virtualService.getAccountData();
        setBalance(data.balance);
        setPositions(data.positions);
        setOrders(data.orders);
      } else {
        // Check if credentials are configured before making API calls
        if (!kucoinService.hasCredentials()) {
          logger.warn('KuCoin credentials not configured. Using virtual mode data.');
          const data = virtualService.getAccountData();
          setBalance(data.balance);
          setPositions(data.positions);
          setOrders(data.orders);
          return;
        }

        const accountData = await kucoinService.getAccountBalance();
        setBalance(accountData.availableBalance);
        const posData = await kucoinService.getPositions();
        setPositions(posData);
        const orderData = await kucoinService.getOpenOrders();
        setOrders(orderData);
      }
    } catch (error) {
      logger.error('Failed to refresh trading data', {}, error as Error);
      // Fallback to virtual data on error
      if (!isVirtual) {
        try {
          const data = virtualService.getAccountData();
          setBalance(data.balance);
          setPositions(data.positions);
          setOrders(data.orders);
        } catch (fallbackError) {
          // Ignore fallback errors
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const placeOrder = async (order: any) => {
    if (isVirtual) {
      return virtualService.placeOrder(order);
    } else {
      return kucoinService.placeOrder(order);
    }
  };

  const closePosition = async (symbol: string) => {
    if (isVirtual) {
      return virtualService.closePosition(symbol);
    } else {
      return kucoinService.closePosition(symbol);
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (isVirtual) {
      return virtualService.cancelOrder(orderId);
    } else {
      return kucoinService.cancelOrder(orderId);
    }
  };

  return (
    <TradingContext.Provider
      value={{
        tradingMode,
        setMode,
        balance,
        positions,
        orders,
        placeOrder,
        closePosition,
        cancelOrder,
        refreshData,
        isLoading,
        // Legacy compatibility
        isVirtual,
        toggleMode,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) console.error('useTrading must be used within TradingProvider');
  return context;
};
