// useSignalWebSocket.ts - WebSocket hook for real-time signal data
import { useEffect, useState, useRef, useCallback } from 'react';
import { Logger } from '../core/Logger.js';
import { StageData } from '../components/signal/SignalStagePipeline';
import { WS_BASE, API_BASE, buildWebSocketUrl } from '../config/env.js';

const logger = Logger.getInstance();

export interface SignalWebSocketData {
    timestamp: string;
    symbol: string;
    price: number;
    stages: {
        stage1: { status: string; progress: number; data?: any };
        stage2: { status: string; progress: number; data?: any };
        stage3: { status: string; progress: number; detectors?: Record<string, number> };
        stage4: { status: string; progress: number; rsi?: number; macd?: number; gate?: string };
        stage5: { status: string; progress: number; detectorScore?: number; aiBoost?: number; finalScore?: number };
        stage6: { status: string; progress: number; consensus?: Record<string, { action: string; confidence: number }> };
        stage7: { status: string; progress: number; atr?: number; riskLevel?: string };
        stage8: { status: string; progress: number; signal?: string; confidence?: number };
    };
    technicals?: {
        support?: number[];
        resistance?: number[];
        orderBlocks?: Array<{ price: number; type: string; strength: number }>;
        fibonacci?: { levels: number[] };
        elliottWaves?: any;
        harmonicPatterns?: any;
    };
    decision?: {
        signal: 'LONG' | 'SHORT' | 'HOLD';
        confidence: number;
        reason: string;
    };
}

export const useSignalWebSocket = (symbol: string, enabled: boolean = true) => {
    const [stages, setStages] = useState<StageData[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [signalData, setSignalData] = useState<SignalWebSocketData | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);

    const connect = useCallback(() => {
        if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            // Use unified buildWebSocketUrl function to prevent /ws/ws duplication
            const wsUrl = buildWebSocketUrl('/ws');

            logger.info('Attempting WebSocket connection to signals endpoint:', { data: wsUrl });
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                logger.info('Signal WebSocket connection opened successfully');
                setIsConnected(true);
                setError(null);
                reconnectAttempts.current = 0;

                // Subscribe to signal updates for the symbol
                ws.send(JSON.stringify({
                    type: 'subscribe',
                    symbol: symbol
                }));
            };

            ws.onmessage = (event) => {
                try {
                    // Validate raw message
                    if (!event.data || typeof event.data !== 'string') {
                        logger.warn('Invalid WebSocket message format: non-string data');
                        return;
                    }

                    const parsed = JSON.parse(event.data);

                    // Validate parsed data structure
                    if (!parsed || typeof parsed !== 'object') {
                        logger.warn('Invalid WebSocket message format: not an object');
                        logger.info('Raw message:', { data: event.data });
                        return;
                    }

                    // Handle different message types
                    if (parsed.type === 'connected') {
                        logger.info('WebSocket connected:', { data: parsed.message });
                        return;
                    }

                    if (parsed.type === 'price_update' || parsed.type === 'sentiment_update') {
                        // These are informational updates, not signal data
                        return;
                    }

                    // Only process signal_update messages that have the stages structure
                    if (parsed.type === 'signal_update' && parsed.data && parsed.data?.stages) {
                        const data: SignalWebSocketData = parsed.data;

                        // Validate that stage1 exists and has the expected structure
                        if (!data?.stages || !data?.stages?.stage1 || typeof data?.stages?.stage1 !== 'object') {
                            logger.warn('WebSocket message missing expected stage1 structure:', parsed);
                            return;
                        }

                        // Transform WebSocket data to StageData format
                        const transformedStages: StageData[] = [
                            {
                                stage: 1,
                                name: 'Market Data',
                                status: data?.stages?.stage1.status as any,
                                progress: data?.stages?.stage1.progress,
                                data: {
                                    price: data.price,
                                    volume: data?.stages?.stage1.data?.volume
                                }
                            },
                            {
                                stage: 2,
                                name: 'Feature Engineering',
                                status: data?.stages.stage2.status as any,
                                progress: data?.stages.stage2.progress,
                                data: data?.stages.stage2.data
                            },
                            {
                                stage: 3,
                                name: 'Detector Analysis',
                                status: data?.stages.stage3.status as any,
                                progress: data?.stages.stage3.progress,
                                data: {
                                    detectors: data?.stages.stage3.detectors || {}
                                }
                            },
                            {
                                stage: 4,
                                name: 'Technical Gate',
                                status: data?.stages.stage4.status as any,
                                progress: data?.stages.stage4.progress,
                                data: {
                                    rsi: data?.stages.stage4.rsi,
                                    macd: data?.stages.stage4.macd,
                                    gate: data?.stages.stage4.gate
                                }
                            },
                            {
                                stage: 5,
                                name: 'AI Scoring',
                                status: data?.stages.stage5.status as any,
                                progress: data?.stages.stage5.progress,
                                data: {
                                    detectorScore: data?.stages.stage5.detectorScore,
                                    aiBoost: data?.stages.stage5.aiBoost,
                                    finalScore: data?.stages.stage5.finalScore
                                }
                            },
                            {
                                stage: 6,
                                name: 'Timeframe Consensus',
                                status: data?.stages.stage6.status as any,
                                progress: data?.stages.stage6.progress,
                                data: {
                                    consensus: data?.stages.stage6.consensus || {}
                                }
                            },
                            {
                                stage: 7,
                                name: 'Risk Management',
                                status: data?.stages.stage7.status as any,
                                progress: data?.stages.stage7.progress,
                                data: {
                                    atr: data?.stages.stage7.atr,
                                    riskLevel: data?.stages.stage7.riskLevel
                                }
                            },
                            {
                                stage: 8,
                                name: 'Final Decision',
                                status: data?.stages.stage8.status as any,
                                progress: data?.stages.stage8.progress,
                                data: {
                                    signal: data.decision?.signal || data?.stages.stage8.signal,
                                    confidence: data.decision?.confidence || data?.stages.stage8.confidence
                                }
                            }
                        ];

                        setStages(transformedStages);
                        setSignalData(data);
                    } else if (parsed.type) {
                        // Handle other message types or log for debugging
                        logger.info('Received different message type:', { data: parsed.type, parsed });
                    } else {
                        // Unknown message type or missing data structure
                        logger.warn('WebSocket message missing expected structure:', parsed);
                        logger.info('Raw message:', { data: event.data });
                    }
                } catch (err) {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSignalWebSocket.ts:202',message:'WebSocket message parse error',data:{error:err instanceof Error?err.message:String(err),errorName:err instanceof Error?err.name:'Unknown',rawData:event.data?.toString().substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'WS4'})}).catch(()=>{});
                    // #endregion
                    const errorMessage = err instanceof Error ? err.message : 'Failed to parse WebSocket message';
                    logger.error('Failed to parse WebSocket message:', {}, err as Error);
                    logger.info('Raw message:', { data: event.data });
                    // Set error but don't break the connection
                    setError('Failed to parse signal data. Connection still active.');
                }
            };

            ws.onerror = (err) => {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSignalWebSocket.ts:210',message:'WebSocket onerror: Error occurred',data:{readyState:ws.readyState,errorType:(err as ErrorEvent)?.type||'Unknown',wsUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'WS4'})}).catch(()=>{});
                // #endregion
                const errorEvent = err as ErrorEvent;
                const errorObj = new Error(`WebSocket error: ${errorEvent.type || 'Unknown error'}`);
                logger.error('Signal WebSocket error:', {}, errorObj);
                logger.info('WebSocket URL:', { data: wsUrl });
                logger.info('WebSocket readyState:', { data: ws.readyState });
                // Set error but allow reconnection attempts
                setError(`WebSocket connection error: ${errorEvent.type || 'Unknown error'}. Attempting to reconnect...`);
                setIsConnected(false);
            };

            ws.onclose = (event) => {
                logger.info('Signal WebSocket closed', {
                    code: event.code,
                    reason: event.reason,
                    wasClean: event.wasClean,
                    readyState: ws.readyState
                });
                setIsConnected(false);

                // Don't reconnect if it was a clean close or if disabled
                if (!enabled || event.wasClean) {
                    return;
                }

                // Attempt to reconnect with exponential backoff
                if (reconnectAttempts.current < 5) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                    reconnectAttempts.current++;
                    logger.info(`Attempting to reconnect signal WebSocket in ${delay}ms (attempt ${reconnectAttempts.current}/5);`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, delay);
                } else {
                    logger.error('Maximum signal WebSocket reconnection attempts reached');
                    setError('Failed to connect to signal WebSocket after multiple attempts. Please check if the server is running.');
                }
            };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            const errorObj = err instanceof Error ? err : new Error(errorMessage);
            logger.error('Failed to create signal WebSocket:', {}, errorObj);
            logger.info('Error details:', { data: errorMessage });
            logger.info('WebSocket URL attempted:', { data: WS_BASE });
            setError(`Failed to establish WebSocket connection: ${errorMessage}`);
            setIsConnected(false);
        }
    }, [symbol, enabled]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setIsConnected(false);
    }, []);

    // Fallback to REST API polling if WebSocket fails
    const pollSignalData = useCallback(async () => {
        try {
            // Use unified API_BASE from env.ts
            const response = await fetch(`${API_BASE}/api/signals/current?symbol=${symbol}`, { mode: "cors", headers: { "Content-Type": "application/json" } });

            if (response.ok) {
                const data: SignalWebSocketData = await response.json();

                // Transform and update stages (same as WebSocket handler)
                const transformedStages: StageData[] = [
                    {
                        stage: 1,
                        name: 'Market Data',
                        status: data?.stages?.stage1.status as any,
                        progress: data?.stages?.stage1.progress,
                        data: { price: data.price, volume: data?.stages?.stage1.data?.volume }
                    },
                    // ... similar transformation for other stages
                ];

                setStages(transformedStages);
                setSignalData(data);
            }
        } catch (err) {
            logger.error('Failed to poll signal data:', {}, err as Error);
        }
    }, [symbol]);

    useEffect(() => {
        if (enabled) {
            connect();
        } else {
            disconnect();
        }

        return () => {
            disconnect();
        };
    }, [connect, disconnect, enabled]);

    // Fallback polling if WebSocket not connected after 3 seconds
    useEffect(() => {
        if (!isConnected && enabled) {
            const timeout = setTimeout(() => {
                pollSignalData();
                const interval = setInterval(pollSignalData, 3000); // Poll every 3 seconds

                return () => clearInterval(interval);
            }, 3000);

            return () => clearTimeout(timeout);
        }
    }, [isConnected, enabled, pollSignalData]);

    return {
        stages,
        isConnected,
        error,
        signalData,
        reconnect: connect,
        disconnect
    };
};

