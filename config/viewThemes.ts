/**
 * View Theme Configuration
 * Each view has its own unique color scheme matching the sidebar gradients
 */

export interface ViewTheme {
  id: string;
  name: string;
  gradient: string;
  backgroundGradient: string;
  glowColor: string;
  accentColor: string;
  borderColor: string;
  primaryHex: string;
  secondaryHex: string;
}

export const VIEW_THEMES: Record<string, ViewTheme> = {
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard',
    gradient: 'from-blue-500 via-blue-600 to-cyan-600',
    backgroundGradient: 'linear-gradient(180deg, #edf2ff 0%, #ffffff 60%, #f8fafc 100%)',
    glowColor: '59, 130, 246',
    accentColor: 'blue',
    borderColor: 'rgba(59, 130, 246, 0.12)',
    primaryHex: '#3b82f6',
    secondaryHex: '#06b6d4'
  },
  charting: {
    id: 'charting',
    name: 'Charting',
    gradient: 'from-emerald-500 via-emerald-600 to-teal-600',
    backgroundGradient: 'linear-gradient(180deg, #ecfdf5 0%, #ffffff 60%, #f0fdf4 100%)',
    glowColor: '16, 185, 129',
    accentColor: 'emerald',
    borderColor: 'rgba(16, 185, 129, 0.12)',
    primaryHex: '#10b981',
    secondaryHex: '#0d9488'
  },
  market: {
    id: 'market',
    name: 'Market',
    gradient: 'from-cyan-500 via-blue-600 to-indigo-600',
    backgroundGradient: 'linear-gradient(180deg, #e0f2fe 0%, #ffffff 60%, #e2e8f0 100%)',
    glowColor: '6, 182, 212',
    accentColor: 'cyan',
    borderColor: 'rgba(6, 182, 212, 0.12)',
    primaryHex: '#06b6d4',
    secondaryHex: '#4f46e5'
  },
  scanner: {
    id: 'scanner',
    name: 'Scanner',
    gradient: 'from-purple-500 via-purple-600 to-pink-600',
    backgroundGradient: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%, #fef2f8 100%)',
    glowColor: '168, 85, 247',
    accentColor: 'purple',
    borderColor: 'rgba(168, 85, 247, 0.15)',
    primaryHex: '#a855f7',
    secondaryHex: '#ec4899'
  },
  trading: {
    id: 'trading',
    name: 'Trading',
    gradient: 'from-yellow-500 via-orange-600 to-red-600',
    backgroundGradient: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 60%, #fef3c7 100%)',
    glowColor: '234, 179, 8',
    accentColor: 'yellow',
    borderColor: 'rgba(234, 179, 8, 0.15)',
    primaryHex: '#eab308',
    secondaryHex: '#ea580c'
  },
  futures: {
    id: 'futures',
    name: 'Futures',
    gradient: 'from-green-500 via-emerald-600 to-teal-600',
    backgroundGradient: 'linear-gradient(180deg, #ecfdf5 0%, #ffffff 60%, #dcfce7 100%)',
    glowColor: '34, 197, 94',
    accentColor: 'green',
    borderColor: 'rgba(34, 197, 94, 0.12)',
    primaryHex: '#22c55e',
    secondaryHex: '#0d9488'
  },
  training: {
    id: 'training',
    name: 'Training',
    gradient: 'from-violet-500 via-violet-600 to-purple-600',
    backgroundGradient: 'linear-gradient(180deg, #ede9fe 0%, #ffffff 60%, #faf5ff 100%)',
    glowColor: '139, 92, 246',
    accentColor: 'violet',
    borderColor: 'rgba(139, 92, 246, 0.15)',
    primaryHex: '#8b5cf6',
    secondaryHex: '#a855f7'
  },
  risk: {
    id: 'risk',
    name: 'Risk',
    gradient: 'from-amber-500 via-amber-600 to-orange-600',
    backgroundGradient: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 60%, #fdf4ff 100%)',
    glowColor: '251, 146, 60',
    accentColor: 'amber',
    borderColor: 'rgba(251, 146, 60, 0.15)',
    primaryHex: '#fb923c',
    secondaryHex: '#ea580c'
  },
  backtest: {
    id: 'backtest',
    name: 'Backtest',
    gradient: 'from-rose-500 via-rose-600 to-red-600',
    backgroundGradient: 'linear-gradient(180deg, #fdf2f8 0%, #ffffff 60%, #fee2e2 100%)',
    glowColor: '244, 63, 94',
    accentColor: 'rose',
    borderColor: 'rgba(244, 63, 94, 0.15)',
    primaryHex: '#f43f5e',
    secondaryHex: '#dc2626'
  },
  health: {
    id: 'health',
    name: 'Health',
    gradient: 'from-indigo-500 via-indigo-600 to-blue-600',
    backgroundGradient: 'linear-gradient(180deg, #eef2ff 0%, #ffffff 60%, #e0f2fe 100%)',
    glowColor: '99, 102, 241',
    accentColor: 'indigo',
    borderColor: 'rgba(99, 102, 241, 0.12)',
    primaryHex: '#6366f1',
    secondaryHex: '#3b82f6'
  },
  settings: {
    id: 'settings',
    name: 'Settings',
    gradient: 'from-slate-500 via-slate-600 to-gray-600',
    backgroundGradient: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 60%, #f1f5f9 100%)',
    glowColor: '100, 116, 139',
    accentColor: 'slate',
    borderColor: 'rgba(100, 116, 139, 0.12)',
    primaryHex: '#64748b',
    secondaryHex: '#4b5563'
  }
};

// Helper function to get theme by view ID
export function getViewTheme(viewId: string): ViewTheme {
  return VIEW_THEMES[viewId] || VIEW_THEMES.dashboard;
}

// Helper to create themed styles
export function getThemedStyles(viewId: string) {
  const theme = getViewTheme(viewId);
  return {
    containerStyle: {
      background: theme.backgroundGradient
    },
    cardStyle: {
      background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
      border: `1px solid ${theme.borderColor}`,
      boxShadow: `0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(${theme.glowColor}, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)`
    },
    headerGradient: theme.gradient,
    glowEffect: {
      boxShadow: `0 0 20px rgba(${theme.glowColor}, 0.5), 0 0 40px rgba(${theme.glowColor}, 0.3)`
    },
    iconGlow: {
      filter: `drop-shadow(0 0 12px rgba(${theme.glowColor}, 0.8))`
    }
  };
}
