/**
 * WebSocket Heartbeat Manager
 *
 * Implements ping/pong heartbeat mechanism to detect and terminate dead WebSocket connections.
 * This prevents resource leaks from stale connections that haven't properly closed.
 *
 * @module wsHeartbeat
 */

import type { Server as WebSocketServer } from 'ws';
import { Logger } from '../core/Logger.js';

const logger = Logger.getInstance();

/**
 * Attaches heartbeat monitoring to a WebSocket server.
 *
 * @param wss - The WebSocket server instance
 * @param intervalMs - Heartbeat check interval in milliseconds (default: 30000ms / 30s)
 */
export function attachHeartbeat(wss: WebSocketServer, intervalMs = 30000): void {
  logger.info(`Attaching WebSocket heartbeat with ${intervalMs}ms interval`);

  wss.on('connection', (ws: any) => {
    // Mark connection as alive initially
    ws.isAlive = true;

    // When we receive a pong, mark the connection as alive
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  });

  // Start heartbeat timer
  const timer = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      // If connection didn't respond to last ping, terminate it
      if (!ws.isAlive) {
        logger.warn('Terminating dead WebSocket connection');
        return ws.terminate();
      }

      // Mark as not alive and send ping
      // Will be marked alive again when pong is received
      ws.isAlive = false;
      ws.ping();
    });
  }, intervalMs);

  // Clean up timer when server closes
  wss.on('close', () => {
    clearInterval(timer);
    logger.info('WebSocket heartbeat stopped');
  });
}
