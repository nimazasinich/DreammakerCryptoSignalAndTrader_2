import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DataMode,
  TradingMode,
  ModeState,
  DEFAULT_MODE,
  parseDataMode,
  parseTradingMode,
} from '../types/modes';
import { readJSON, writeJSON } from '../lib/storage';

type ModeCtx = {
  state: ModeState;
  setDataMode: (m: DataMode) => void;
  setTradingMode: (m: TradingMode) => void;
};

const Ctx = createContext<ModeCtx | null>(null);
const KEY = 'app.mode.state.v1';

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ModeState>(() => {
    const saved = readJSON<Partial<ModeState>>(KEY, {});
    // اگر مقدار ذخیره‌شده وجود نداشت، از DEFAULT_MODE استفاده کن
    return {
      dataMode: saved.dataMode ? parseDataMode(saved.dataMode as any) : DEFAULT_MODE.dataMode,
      tradingMode: saved.tradingMode ? parseTradingMode(saved.tradingMode as any) : DEFAULT_MODE.tradingMode,
    };
  });

  useEffect(() => {
    writeJSON(KEY, state);
  }, [state]);

  const setDataMode = useCallback(
    (m: DataMode) => setState((s) => ({ ...s, dataMode: m })),
    []
  );
  const setTradingMode = useCallback(
    (m: TradingMode) => setState((s) => ({ ...s, tradingMode: m })),
    []
  );

  const value = useMemo(
    () => ({ state, setDataMode, setTradingMode }),
    [state, setDataMode, setTradingMode]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMode() {
  const ctx = useContext(Ctx);
  if (!ctx) console.error('ModeContext not available');
  return ctx;
}
