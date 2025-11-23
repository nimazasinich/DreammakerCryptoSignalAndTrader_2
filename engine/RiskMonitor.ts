// Risk monitoring for liquidation alerts
import { OHLC } from './types';
import { atr } from './Indicators';
import { sendLiquidationAlert } from './NotificationService';
import { Logger } from '../core/Logger.js';

const logger = Logger.getInstance();

export interface PositionRisk {
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  size: number;
  leverage: number;
  margin: number;
  liquidationPrice: number;
  liquidationRisk: boolean;
  marginRatio: number;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Calculate liquidation price for a leveraged position
 */
function calculateLiquidationPrice(
  entryPrice: number,
  leverage: number,
  isLong: boolean
): number {
  // Simplified liquidation calculation (actual exchanges may vary)
  // For long: liquidationPrice = entryPrice * (1 - 1/leverage)
  // For short: liquidationPrice = entryPrice * (1 + 1/leverage)

  const maintenanceMarginRate = 0.005; // 0.5% maintenance margin (typical)
  const buffer = 1 / leverage - maintenanceMarginRate;

  if (isLong) {
    return entryPrice * (1 - buffer);
  } else {
    return entryPrice * (1 + buffer);
  }
}

/**
 * Calculate margin ratio
 * MarginRatio = (EquityValue - MaintenanceMargin) / EquityValue
 * When this approaches 0, liquidation occurs
 */
function calculateMarginRatio(
  entryPrice: number,
  currentPrice: number,
  leverage: number,
  isLong: boolean
): number {
  const pnlPercent = isLong
    ? (currentPrice - entryPrice) / entryPrice
    : (entryPrice - currentPrice) / entryPrice;

  // Equity = Initial Margin + PnL
  const initialMargin = 1 / leverage;
  const equity = initialMargin + pnlPercent;

  const maintenanceMarginRate = 0.005;
  const marginRatio = (equity - maintenanceMarginRate) / equity;

  return Math.max(0, marginRatio);
}

/**
 * Evaluate position risk
 */
export function evaluatePositionRisk(
  symbol: string,
  entryPrice: number,
  currentPrice: number,
  size: number,
  leverage: number,
  isLong: boolean
): PositionRisk {
  const liquidationPrice = calculateLiquidationPrice(entryPrice, leverage, isLong);
  const marginRatio = calculateMarginRatio(entryPrice, currentPrice, leverage, isLong);

  // Calculate distance to liquidation
  const distanceToLiquidation = isLong
    ? (currentPrice - liquidationPrice) / currentPrice
    : (liquidationPrice - currentPrice) / currentPrice;

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high';
  let liquidationRisk = false;

  if (marginRatio < 0.1 || distanceToLiquidation < 0.05) {
    riskLevel = 'high';
    liquidationRisk = true;
  } else if (marginRatio < 0.3 || distanceToLiquidation < 0.15) {
    riskLevel = 'medium';
    liquidationRisk = true;
  } else {
    riskLevel = 'low';
    liquidationRisk = false;
  }

  const margin = (size * entryPrice) / leverage;

  return {
    symbol,
    entryPrice,
    currentPrice,
    size,
    leverage,
    margin,
    liquidationPrice,
    liquidationRisk,
    marginRatio,
    riskLevel
  };
}

/**
 * Monitor position and send alerts if at risk
 */
export async function monitorPosition(
  symbol: string,
  entryPrice: number,
  currentPrice: number,
  size: number,
  leverage: number,
  isLong: boolean
): Promise<PositionRisk> {
  const risk = evaluatePositionRisk(symbol, entryPrice, currentPrice, size, leverage, isLong);

  // Send alert if liquidation risk is detected
  if (risk.liquidationRisk) {
    logger.warn('Liquidation risk detected', {
      symbol,
      riskLevel: risk.riskLevel,
      marginRatio: risk.marginRatio
    });

    await sendLiquidationAlert(symbol, {
      currentPrice: risk.currentPrice,
      liquidationPrice: risk.liquidationPrice,
      marginRatio: risk.marginRatio,
      riskLevel: risk.riskLevel
    });
  }

  return risk;
}

/**
 * Estimate liquidation risk using ATR (when position data is not available)
 * This is a proxy method when we don't have full position details
 */
export function estimateLiquidationRiskFromATR(
  symbol: string,
  ohlc: OHLC[],
  accountRiskPercent: number = 0.02 // 2% of account
): boolean {
  if (ohlc.length < 50) {
    return false; // Not enough data
  }

  const atrValues = atr(ohlc, 14);
  const currentATR = atrValues[atrValues.length - 1];
  const currentPrice = ohlc[ohlc.length - 1].c;

  // If ATR is more than accountRiskPercent of price, it's high volatility
  const atrPercent = currentATR / currentPrice;

  // High volatility increases liquidation risk for leveraged positions
  if (atrPercent > accountRiskPercent * 2) {
    logger.warn('High volatility detected - liquidation risk may be elevated', {
      symbol,
      atrPercent: `${(atrPercent * 100).toFixed(2)}%`
    });
    return true;
  }

  return false;
}
