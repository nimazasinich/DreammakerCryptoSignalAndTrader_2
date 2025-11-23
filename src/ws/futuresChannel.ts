/**
 * Futures WebSocket Channel
 * Handles WebSocket events for futures trading updates
 */
import { WebSocket } from 'ws';
import { Logger } from '../core/Logger.js';
import { FuturesService } from '../services/FuturesService.js';
import { FEATURE_FUTURES } from '../config/flags.js';
import { FuturesPosition, FuturesOrder } from '../types/futures.js';

export class FuturesWebSocketChannel {
  private static instance: FuturesWebSocketChannel;
  private logger = Logger.getInstance();
  private futuresService = FuturesService.getInstance();
  private connectedClients = new Set<WebSocket>();
  private positionUpdateInterval: NodeJS.Timeout | null = null;

  private constructor() {
    if (FEATURE_FUTURES) {
      this.startPositionMonitoring();
    }
  }

  static getInstance(): FuturesWebSocketChannel {
    if (!FuturesWebSocketChannel.instance) {
      FuturesWebSocketChannel.instance = new FuturesWebSocketChannel();
    }
    return FuturesWebSocketChannel.instance;
  }

  handleConnection(client: WebSocket): void {
    if (!FEATURE_FUTURES) {
      client.send(JSON.stringify({
        type: 'error',
        message: 'Futures trading is disabled. Set FEATURE_FUTURES=true to enable.'
      }));
      client.close();
      return;
    }

    this.connectedClients.add(client);
    this.logger.info('Futures WebSocket client connected', { clients: this.connectedClients.size });

    // Send welcome message
    client.send(JSON.stringify({
      type: 'futures_connected',
      message: 'Connected to futures channel',
      timestamp: Date.now()
    }));

    // Send initial positions
    this.sendPositions(client).catch(error => {
      this.logger.error('Failed to send initial positions', {}, error as Error);
    });

    client.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleMessage(client, data);
      } catch (error) {
        this.logger.error('Failed to parse WebSocket message', {}, error as Error);
        client.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    client.on('close', () => {
      this.connectedClients.delete(client);
      this.logger.info('Futures WebSocket client disconnected', { clients: this.connectedClients.size });
    });

    client.on('error', (error) => {
      this.logger.error('Futures WebSocket client error', {}, error);
      this.connectedClients.delete(client);
    });
  }

  private async handleMessage(client: WebSocket, data: any): Promise<void> {
    try {
      switch (data.type) {
        case 'subscribe_positions':
          await this.sendPositions(client);
          break;
        case 'subscribe_orders':
          await this.sendOrders(client);
          break;
        case 'get_positions':
          await this.sendPositions(client);
          break;
        case 'get_orders':
          await this.sendOrders(client);
          break;
        default:
          client.send(JSON.stringify({
            type: 'error',
            message: `Unknown message type: ${data.type}`
          }));
      }
    } catch (error) {
      this.logger.error('Failed to handle WebSocket message', { type: data.type }, error as Error);
      client.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process request'
      }));
    }
  }

  private async sendPositions(client: WebSocket): Promise<void> {
    try {
      const positions = await this.futuresService.getPositions();
      client.send(JSON.stringify({
        type: 'position_update',
        data: positions,
        timestamp: Date.now()
      }));
    } catch (error) {
      this.logger.error('Failed to send positions', {}, error as Error);
      client.send(JSON.stringify({
        type: 'error',
        message: 'Failed to fetch positions'
      }));
    }
  }

  private async sendOrders(client: WebSocket): Promise<void> {
    try {
      const orders = await this.futuresService.getOpenOrders();
      client.send(JSON.stringify({
        type: 'order_update',
        data: orders,
        timestamp: Date.now()
      }));
    } catch (error) {
      this.logger.error('Failed to send orders', {}, error as Error);
      client.send(JSON.stringify({
        type: 'error',
        message: 'Failed to fetch orders'
      }));
    }
  }

  private startPositionMonitoring(): void {
    // Update positions every 5 seconds
    this.positionUpdateInterval = setInterval(async () => {
      if (this.connectedClients.size === 0) return;

      try {
        const positions = await this.futuresService.getPositions();
        const orders = await this.futuresService.getOpenOrders();

        const message = JSON.stringify({
          type: 'position_update',
          data: positions,
          timestamp: Date.now()
        });

        this.connectedClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            try {
              client.send(message);
            } catch (error) {
              this.logger.error('Failed to send position update', {}, error as Error);
            }
          }
        });

        if ((orders?.length || 0) > 0) {
          const orderMessage = JSON.stringify({
            type: 'order_update',
            data: orders,
            timestamp: Date.now()
          });

          this.connectedClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              try {
                client.send(orderMessage);
              } catch (error) {
                this.logger.error('Failed to send order update', {}, error as Error);
              }
            }
          });
        }
      } catch (error) {
        this.logger.error('Failed to monitor positions', {}, error as Error);
      }
    }, 5000);
  }

  broadcastPositionUpdate(position: FuturesPosition): void {
    const message = JSON.stringify({
      type: 'position_update',
      data: [position],
      timestamp: Date.now()
    });

    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          this.logger.error('Failed to broadcast position update', {}, error as Error);
        }
      }
    });
  }

  broadcastOrderUpdate(order: FuturesOrder): void {
    const message = JSON.stringify({
      type: 'order_update',
      data: [order],
      timestamp: Date.now()
    });

    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          this.logger.error('Failed to broadcast order update', {}, error as Error);
        }
      }
    });
  }

  broadcastFundingRate(symbol: string, rate: number): void {
    const message = JSON.stringify({
      type: 'funding_tick',
      data: {
        symbol,
        rate,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });

    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          this.logger.error('Failed to broadcast funding rate', {}, error as Error);
        }
      }
    });
  }

  destroy(): void {
    if (this.positionUpdateInterval) {
      clearInterval(this.positionUpdateInterval);
      this.positionUpdateInterval = null;
    }
    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
    this.connectedClients.clear();
  }
}
