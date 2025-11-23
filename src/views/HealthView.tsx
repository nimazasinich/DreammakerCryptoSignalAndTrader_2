import React, { useEffect, useState, useContext } from 'react';
import { Logger } from '../core/Logger.js';
import { Activity, Database, Wifi, Cpu, HardDrive, MemoryStick, Server, AlertCircle } from 'lucide-react';
import { HealthCheckService } from '../monitoring/HealthCheckService';
import { MetricsCollector } from '../monitoring/MetricsCollector';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';
import { dataManager } from '../services/dataManager';
import { LiveDataContext } from '../components/LiveDataContext';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import ResponseHandler from '../components/ui/ResponseHandler';
import { USE_MOCK_DATA } from '../config/env.js';

interface HealthMetrics {
    system: {
        cpu: number;
        memory: number;
        disk: number;
    };
    connections: {
        binance: 'connected' | 'disconnected' | 'error';
        database: 'connected' | 'disconnected' | 'error';
        latency: number;
    };
    performance: {
        uptime: number;
        requests: number;
        errors: number;
    };
}


const logger = Logger.getInstance();

export const HealthView: React.FC = () => {
    const [metrics, setMetrics] = useState<HealthMetrics>({
        system: { cpu: 0, memory: 0, disk: 0 },
        connections: { binance: 'connected', database: 'connected', latency: 0 },
        performance: { uptime: 0, requests: 0, errors: 0 }
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    const liveData = useContext(LiveDataContext);
    const healthCheckService = HealthCheckService.getInstance();
    const metricsCollector = MetricsCollector.getInstance();
    const performanceMonitor = PerformanceMonitor.getInstance();

    useEffect(() => {
        const fetchHealthMetrics = async () => {
            try {
                setLoading(true);
                setError(null);

                // Use monitoring services to get comprehensive health data
                const healthStatus = await healthCheckService.performHealthCheck();
                const performanceMetrics = performanceMonitor.collectMetrics();
                const apiMetrics = metricsCollector.getSummary();

                // Combine data from all monitoring services
                setMetrics({
                    system: {
                        cpu: performanceMetrics.memory.heapUsagePercent || 0,
                        memory: performanceMetrics.memory.heapUsagePercent || 0,
                        disk: 0 // Would need additional monitoring for disk
                    },
                    connections: {
                        binance: healthStatus.services.binance.status === 'healthy' ? 'connected' :
                            (healthStatus.services.binance.status === 'unhealthy' ? 'error' : 'disconnected'),
                        database: healthStatus.services.database.status === 'healthy' ? 'connected' :
                            (healthStatus.services.database.status === 'unhealthy' ? 'error' : 'disconnected'),
                        latency: healthStatus.services.binance.latency || 0
                    },
                    performance: {
                        uptime: healthStatus.system.uptime || performanceMetrics.system?.uptime || 0,
                        requests: apiMetrics.totalApiCalls || 0,
                        errors: apiMetrics.totalApiCalls > 0 ? Math.round((apiMetrics.errorRate / 100) * apiMetrics.totalApiCalls) : 0
                    }
                });

                setLoading(false);
            } catch (error) {
                logger.error('Failed to fetch health metrics:', {}, error);
                setError(error instanceof Error ? error : new Error('Failed to fetch health metrics'));
                setMetrics(prev => ({
                    ...prev,
                    connections: {
                        ...prev.connections,
                        binance: 'error',
                        database: 'error'
                    }
                }));
                setLoading(false);
                
                // No mock data - show proper error state
                logger.error('Health check failed - showing error state to user');
            }
        };

        // Subscribe to real-time health updates
        const handleRealTimeUpdate = (data: any) => {
            if (data && data.type === 'health') {
                setMetrics(prev => ({
                    ...prev,
                    system: {
                        ...prev.system,
                        cpu: data.cpu || prev.system.cpu,
                        memory: data.memory || prev.system.memory,
                        disk: data.disk || prev.system.disk
                    },
                    connections: {
                        ...prev.connections,
                        latency: data.latency || prev.connections.latency
                    }
                }));
            }
        };

        // Subscribe to health updates
        const unsubscribe = liveData.subscribeToHealth(handleRealTimeUpdate);

        fetchHealthMetrics();
        const interval = setInterval(fetchHealthMetrics, 30000); // Reduced polling frequency

        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [liveData]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'connected': return 'text-emerald-400';
            case 'error': return 'text-red-400';
            default: return 'text-amber-400';
        }
    };

    const getStatusDot = (status: string) => {
        switch (status) {
            case 'connected': return 'bg-emerald-400';
            case 'error': return 'bg-red-400';
            default: return 'bg-amber-400';
        }
    };

    const getUsageColor = (usage: number) => {
        if (usage < 50) return 'text-emerald-400';
        if (usage < 80) return 'text-amber-400';
        return 'text-red-400';
    };

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    return (
        <ErrorBoundary>
            <ResponseHandler isLoading={loading} error={error} data={metrics}>
                {(data) => (
                    <div className="health-view p-4 space-y-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Activity className="text-primary" />
                            System Health
                        </h2>

                        {/* System Resources */}
                        <div className="bg-card rounded-lg p-4">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Server className="text-primary" size={18} />
                                System Resources
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* CPU Usage */}
                                <div className="bg-background p-4 rounded-md">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <Cpu size={16} />
                                            <span>CPU Usage</span>
                                        </div>
                                        <span className={getUsageColor(data.system.cpu)}>
                                            {data.system.cpu}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${data.system.cpu < 50 ? 'bg-emerald-400' :
                                                data.system.cpu < 80 ? 'bg-amber-400' : 'bg-red-400'
                                                }`}
                                            style={{ width: `${data.system.cpu}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Memory Usage */}
                                <div className="bg-background p-4 rounded-md">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <MemoryStick size={16} />
                                            <span>Memory Usage</span>
                                        </div>
                                        <span className={getUsageColor(data.system.memory)}>
                                            {data.system.memory}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${data.system.memory < 50 ? 'bg-emerald-400' :
                                                data.system.memory < 80 ? 'bg-amber-400' : 'bg-red-400'
                                                }`}
                                            style={{ width: `${data.system.memory}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Disk Usage */}
                                <div className="bg-background p-4 rounded-md">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <HardDrive size={16} />
                                            <span>Disk Usage</span>
                                        </div>
                                        <span className={getUsageColor(data.system.disk)}>
                                            {data.system.disk}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${data.system.disk < 50 ? 'bg-emerald-400' :
                                                data.system.disk < 80 ? 'bg-amber-400' : 'bg-red-400'
                                                }`}
                                            style={{ width: `${data.system.disk}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Connections */}
                        <div className="bg-card rounded-lg p-4">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Wifi className="text-primary" size={18} />
                                Connections
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Exchange Connection */}
                                <div className="bg-background p-4 rounded-md">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${getStatusDot(data.connections.binance)}`}></div>
                                            <span>Exchange API</span>
                                        </div>
                                        <span className={getStatusColor(data.connections.binance)}>
                                            {data.connections.binance}
                                        </span>
                                    </div>
                                </div>

                                {/* Database Connection */}
                                <div className="bg-background p-4 rounded-md">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${getStatusDot(data.connections.database)}`}></div>
                                            <span>Database</span>
                                        </div>
                                        <span className={getStatusColor(data.connections.database)}>
                                            {data.connections.database}
                                        </span>
                                    </div>
                                </div>

                                {/* API Latency */}
                                <div className="bg-background p-4 rounded-md">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Activity size={16} />
                                            <span>API Latency</span>
                                        </div>
                                        <span className={data.connections.latency < 100 ? 'text-emerald-400' :
                                            data.connections.latency < 300 ? 'text-amber-400' : 'text-red-400'}>
                                            {data.connections.latency}ms
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Performance Metrics */}
                        <div className="bg-card rounded-lg p-4">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Activity className="text-primary" size={18} />
                                Performance
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Uptime */}
                                <div className="bg-background p-4 rounded-md">
                                    <div className="flex justify-between items-center">
                                        <span>Uptime</span>
                                        <span className="text-emerald-400">
                                            {formatUptime(data.performance.uptime)}
                                        </span>
                                    </div>
                                </div>

                                {/* Total Requests */}
                                <div className="bg-background p-4 rounded-md">
                                    <div className="flex justify-between items-center">
                                        <span>Total Requests</span>
                                        <span>{data.performance.requests.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Error Count */}
                                <div className="bg-background p-4 rounded-md">
                                    <div className="flex justify-between items-center">
                                        <span>Error Count</span>
                                        <span className={data.performance.errors > 0 ? 'text-red-400' : 'text-emerald-400'}>
                                            {data.performance.errors.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </ResponseHandler>
        </ErrorBoundary>
    );
};

export default HealthView;