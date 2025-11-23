import { WebSocket } from 'ws';
import { Logger } from '../core/Logger.js';

const logger = Logger.getInstance();

let clientsSet: Set<WebSocket> | null = null;

/**
 * Initialize the broadcast system with the connected clients set
 */
export function initBroadcast(clients: Set<WebSocket>) {
  clientsSet = clients;
}

/**
 * Broadcast a message to all connected WebSocket clients
 */
export function broadcast(type: string, data: any) {
  if (!clientsSet) {
    logger.warn('Broadcast attempted before initialization');
    return;
  }

  const message = JSON.stringify({
    type,
    data,
    timestamp: Date.now()
  });

  let sent = 0;
  let failed = 0;

  clientsSet.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        sent++;
      } catch (error) {
        failed++;
        logger.error('Failed to send WS broadcast', {}, error as Error);
      }
    }
  });

  logger.debug(`Broadcast sent: type=${type}, clients=${sent}, failed=${failed}`);
}

/**
 * Broadcast liquidation risk alert
 */
export function broadcastLiquidationRisk(payload: {
  symbol: string;
  currentPrice: number;
  liquidationPrice: number;
  marginRatio: number;
  riskLevel: 'low' | 'medium' | 'high';
}) {
  broadcast('liquidation_risk', payload);
}
