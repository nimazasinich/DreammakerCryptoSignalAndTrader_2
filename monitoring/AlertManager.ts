// src/monitoring/AlertManager.ts
import { Logger } from '../core/Logger.js';

export interface Alert {
  id: string;
  type: 'performance' | 'health' | 'error' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  context?: Record<string, any>;
  timestamp: number;
  acknowledged: boolean;
}

export class AlertManager {
  private static instance: AlertManager;
  private logger = Logger.getInstance();
  private alerts: Alert[] = [];
  private maxAlerts = 1000;
  private subscribers: Set<(alert: Alert) => void> = new Set();

  private constructor() {}

  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    message: string,
    context?: Record<string, any>
  ): Alert {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      context,
      timestamp: Date.now(),
      acknowledged: false
    };

    this.alerts.push(alert);

    // Keep only recent alerts
    if ((this.alerts?.length || 0) > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    // Notify subscribers
    this.notifySubscribers(alert);

    // Log based on severity
    if (severity === 'critical') {
      this.logger.critical('Critical alert created', context || {}, new Error(message));
    } else if (severity === 'high') {
      this.logger.error('High severity alert', context || {});
    } else {
      this.logger.warn('Alert created', { type, severity, message });
    }

    return alert;
  }

  getAlerts(filters?: {
    type?: Alert['type'];
    severity?: Alert['severity'];
    acknowledged?: boolean;
    since?: number;
  }): Alert[] {
    let filtered = this.alerts;

    if (filters?.type) {
      filtered = filtered.filter(a => a.type === filters.type);
    }

    if (filters?.severity) {
      filtered = filtered.filter(a => a.severity === filters.severity);
    }

    if (filters?.acknowledged !== undefined) {
      filtered = filtered.filter(a => a.acknowledged === filters.acknowledged);
    }

    if (filters?.since) {
      filtered = filtered.filter(a => a.timestamp >= filters.since!);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.logger.info('Alert acknowledged', { alertId, type: alert.type });
      return true;
    }
    return false;
  }

  subscribe(callback: (alert: Alert) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(alert: Alert): void {
    this.subscribers.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        this.logger.error('Alert subscriber callback failed', {}, error as Error);
      }
    });
  }

  getUnacknowledgedCount(): number {
    return this?.alerts?.filter(a => !a.acknowledged).length;
  }

  getStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    unacknowledged: number;
  } {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    this.alerts.forEach(alert => {
      byType[alert.type] = (byType[alert.type] || 0) + 1;
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
    });

    return {
      total: this.alerts.length,
      byType,
      bySeverity,
      unacknowledged: this.getUnacknowledgedCount()
    };
  }

  clear(): void {
    this.alerts = [];
    this.logger.info('Alerts cleared');
  }
}

