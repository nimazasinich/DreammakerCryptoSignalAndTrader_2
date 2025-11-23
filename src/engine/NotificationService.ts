// Notification service for signal alerts
import { FinalSignal } from './types';
import { Logger } from '../core/Logger.js';
import { notifyHighSeverity, notifyLiquidation } from '../services/telegram.js';
import { broadcastLiquidationRisk } from '../server/wsBroadcast.js';

const logger = Logger.getInstance();

export type AlertPayload = {
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
};

// Rate limiting: track last alert time per symbol/action
const lastAlertTime = new Map<string, number>();
const RATE_LIMIT_MS = 60000; // 60 seconds

/**
 * Send Telegram notification
 * Server-side only - reads credentials from secret store
 */
export async function notifyTelegram(payload: AlertPayload): Promise<boolean> {
  try {
    // Load secrets from encrypted store
    const { loadSecrets } = await import('../utils/secretStore.js');
    const secrets = loadSecrets();

    if (!secrets.telegramBotToken || !secrets.telegramChatId) {
      logger.warn('Telegram not configured, skipping notification');
      return false;
    }

    // Format message with severity indicator
    const severityEmoji = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨'
    };

    const emoji = severityEmoji[payload.severity] || 'ℹ️';
    const formattedMessage = `${emoji} *${payload.title}*\n\n${payload.message}`;

    // Send via Telegram API
    const axios = (await import('axios')).default;
    const response = await axios.post(
      `https://api.telegram.org/bot${secrets.telegramBotToken}/sendMessage`,
      {
        chat_id: secrets.telegramChatId,
        text: formattedMessage,
        parse_mode: 'Markdown'
      }
    );

    if (response.data.ok) {
      logger.info('Telegram notification sent', { title: payload.title, severity: payload.severity });
      return true;
    } else {
      logger.error('Telegram API returned not ok', { response: response.data });
      return false;
    }
  } catch (error: any) {
    logger.error('Failed to send Telegram notification', {}, error);
    return false;
  }
}

/**
 * Check if we should send an alert (rate limiting + deduplication)
 */
function shouldSendAlert(key: string): boolean {
  const now = Date.now();
  const lastTime = lastAlertTime.get(key);

  if (!lastTime || now - lastTime > RATE_LIMIT_MS) {
    lastAlertTime.set(key, now);
    return true;
  }

  return false;
}

/**
 * Send alert for important signal
 */
export async function sendSignalAlert(signal: FinalSignal): Promise<void> {
  // Only send alerts for:
  // - High severity signals
  // - Medium/high confidence signals with strong action
  const shouldAlert =
    signal.severity === 'high' ||
    (signal.confidence > 0.8 && signal.action !== 'HOLD') ||
    signal.score > 0.85 ||
    signal.score < 0.15;

  if (!shouldAlert) {
    return;
  }

  // Rate limiting key
  const alertKey = `${signal.symbol}-${signal.action}`;

  if (!shouldSendAlert(alertKey)) {
    logger.debug('Skipping alert due to rate limit', { key: alertKey });
    return;
  }

  // Format the alert message
  const title = `Important Signal: ${signal.symbol}`;
  const message = `
*Symbol:* ${signal.symbol}
*Action:* ${signal.action}
*Score:* ${signal.score.toFixed(2)} | *Confidence:* ${signal.confidence.toFixed(2)}

*Reasoning:*
${signal.reasoning.slice(0, 5).map(r => `• ${r}`).join('\n')}

*Time:* ${new Date(signal.time).toISOString()}
  `.trim();

  await notifyTelegram({
    title,
    message,
    severity: signal.severity
  });

  await notifyHighSeverity({
    symbol: signal.symbol,
    side: signal.action === 'BUY' ? 'LONG' : 'SHORT',
    score: Number(signal.score.toFixed(2)),
    timeframe: (signal as any).timeframes?.join(',') || 'unknown',
    price: (signal as any).metadata?.price || 0,
    riskPct: (signal as any).risk?.atr || undefined
  });
}

/**
 * Send liquidation risk alert
 */
export async function sendLiquidationAlert(
  symbol: string,
  details: {
    currentPrice: number;
    liquidationPrice: number;
    marginRatio: number;
    riskLevel: 'low' | 'medium' | 'high';
  }
): Promise<void> {
  const alertKey = `liquidation-${symbol}`;

  if (!shouldSendAlert(alertKey)) {
    logger.debug('Skipping liquidation alert due to rate limit', { key: alertKey });
    return;
  }

  const title = `🚨 Liquidation Risk: ${symbol}`;
  const message = `
*Warning:* Your position is at risk of liquidation!

*Symbol:* ${symbol}
*Current Price:* $${details.currentPrice.toFixed(2)}
*Liquidation Price:* $${details.liquidationPrice.toFixed(2)}
*Margin Ratio:* ${(details.marginRatio * 100).toFixed(2)}%
*Risk Level:* ${details.riskLevel.toUpperCase()}

*Action Required:* Consider reducing leverage or adding margin.
  `.trim();

  await notifyTelegram({
    title,
    message,
    severity: details.riskLevel
  });

  await notifyLiquidation({
    symbol,
    liqPrice: details.liquidationPrice,
    margin: details.marginRatio * 100,
    price: details.currentPrice
  });

  // Broadcast to WebSocket clients
  broadcastLiquidationRisk({
    symbol,
    currentPrice: details.currentPrice,
    liquidationPrice: details.liquidationPrice,
    marginRatio: details.marginRatio,
    riskLevel: details.riskLevel
  });
}
