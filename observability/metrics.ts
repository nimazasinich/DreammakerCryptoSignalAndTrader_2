import client from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

const METRICS_ENABLED = (process.env.METRICS_ENABLED ?? 'true') === 'true';

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry, prefix: 'dcs_' });

export const httpRequestsTotal = new client.Counter({
  name: 'dcs_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
});
export const httpRequestDurationMs = new client.Histogram({
  name: 'dcs_http_request_duration_ms',
  help: 'HTTP request duration in ms',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [25, 50, 100, 200, 400, 800, 1600, 3200],
});
export const wsConnections = new client.Gauge({
  name: 'dcs_ws_connections',
  help: 'Active WebSocket connections',
});
export const providerSuccess = new client.Counter({
  name: 'dcs_provider_success_total',
  help: 'Provider success responses',
  labelNames: ['provider'] as const,
});
export const providerFailure = new client.Counter({
  name: 'dcs_provider_failure_total',
  help: 'Provider failures',
  labelNames: ['provider', 'code'] as const,
});
export const providerLatency = new client.Histogram({
  name: 'dcs_provider_latency_ms',
  help: 'Provider latency in ms',
  labelNames: ['provider'] as const,
  buckets: [25, 50, 100, 200, 400, 800, 1600, 3200],
});
export const providerReputation = new client.Gauge({
  name: 'dcs_provider_reputation',
  help: 'EMA reputation score per provider (-1..+1)',
  labelNames: ['provider'] as const,
});

registry.registerMetric(httpRequestsTotal);
registry.registerMetric(httpRequestDurationMs);
registry.registerMetric(wsConnections);
registry.registerMetric(providerSuccess);
registry.registerMetric(providerFailure);
registry.registerMetric(providerLatency);
registry.registerMetric(providerReputation);

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!METRICS_ENABLED) return next();
  const start = Date.now();
  res.on('finish', () => {
    try {
      const route = (req.route?.path || req.path || 'unknown');
      const labels = { method: req.method, route, status: String(res.statusCode) };
      httpRequestsTotal.inc(labels);
      httpRequestDurationMs.observe(labels, Date.now() - start);
    } catch {}
  });
  next();
}

export function metricsRoute() {
  return async (_req: Request, res: Response) => {
    if (!METRICS_ENABLED) return res.status(404).send('metrics disabled');
    res.set('Content-Type', registry.contentType);
    res.send(await registry.metrics());
  };
}
