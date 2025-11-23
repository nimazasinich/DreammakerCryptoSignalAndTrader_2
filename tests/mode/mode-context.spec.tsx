import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ModeProvider, useMode } from '../../src/contexts/ModeContext';
import { DataMode, TradingMode } from '../../src/types/modes';

describe('ModeContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should provide default modes', () => {
    const { result } = renderHook(() => useMode(), {
      wrapper: ModeProvider,
    });

    expect(result.current.state.dataMode).toBe('offline');
    expect(result.current.state.tradingMode).toBe('virtual');
  });

  it('should update data mode', () => {
    const { result } = renderHook(() => useMode(), {
      wrapper: ModeProvider,
    });

    act(() => {
      result.current.setDataMode('online');
    });

    expect(result.current.state.dataMode).toBe('online');
  });

  it('should update trading mode', () => {
    const { result } = renderHook(() => useMode(), {
      wrapper: ModeProvider,
    });

    act(() => {
      result.current.setTradingMode('real');
    });

    expect(result.current.state.tradingMode).toBe('real');
  });

  it('should persist modes to localStorage', () => {
    const { result } = renderHook(() => useMode(), {
      wrapper: ModeProvider,
    });

    act(() => {
      result.current.setDataMode('online');
      result.current.setTradingMode('real');
    });

    const stored = JSON.parse(localStorage.getItem('app.mode.state.v1') || '{}');
    expect(stored.dataMode).toBe('online');
    expect(stored.tradingMode).toBe('real');
  });

  it('should restore modes from localStorage on mount', () => {
    localStorage.setItem(
      'app.mode.state.v1',
      JSON.stringify({ dataMode: 'online', tradingMode: 'real' })
    );

    const { result } = renderHook(() => useMode(), {
      wrapper: ModeProvider,
    });

    expect(result.current.state.dataMode).toBe('online');
    expect(result.current.state.tradingMode).toBe('real');
  });

  it('should handle invalid stored values gracefully', () => {
    localStorage.setItem(
      'app.mode.state.v1',
      JSON.stringify({ dataMode: 'invalid', tradingMode: 'invalid' })
    );

    const { result } = renderHook(() => useMode(), {
      wrapper: ModeProvider,
    });

    expect(result.current.state.dataMode).toBe('offline');
    expect(result.current.state.tradingMode).toBe('virtual');
  });
});
