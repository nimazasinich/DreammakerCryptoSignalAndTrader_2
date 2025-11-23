/**
 * Scanner Feed Panel
 * Displays real-time scanner agent candidates via WebSocket
 * Read-only, advisory component
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Clock, Target } from 'lucide-react';
import { Logger } from '../../core/Logger';

const logger = Logger.getInstance();

interface ScannerCandidate {
  symbol: string;
  side: 'LONG' | 'SHORT';
  score: number;
  confluence: number;
  volumeUSD: number;
  rank: number;
  timeframe: string;
  reasons: string[];
  ts: number;
}

interface ScannerUpdate {
  ts: number;
  timeframe: string;
  candidates: ScannerCandidate[];
}

const ScannerFeedPanel: React.FC = () => {
  const [candidates, setCandidates] = useState<ScannerCandidate[]>([]);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket
    const wsUrl = `ws://${window.location.hostname}:${
      import.meta.env.VITE_WS_PORT || '3001'
    }/ws`;

    let ws: WebSocket | null = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          logger.info('ScannerFeedPanel WebSocket connected');
          setConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === 'agent_scanner_update') {
              const update: ScannerUpdate = message.data;
              logger.info('Received scanner update', { candidates: update.candidates.length });

              setCandidates(update.candidates);
              setLastUpdate(update.ts);
            }
          } catch (error) {
            logger.error('Failed to parse WebSocket message', {}, error as Error);
          }
        };

        ws.onerror = (error) => {
          logger.error('ScannerFeedPanel WebSocket error', {}, error as any);
          setConnected(false);
        };

        ws.onclose = () => {
          logger.warn('ScannerFeedPanel WebSocket closed, reconnecting...');
          setConnected(false);
          setTimeout(connect, 3000); // Reconnect after 3 seconds
        };
      } catch (error) {
        logger.error('Failed to connect to WebSocket', {}, error as Error);
        setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const formatVolume = (volume: number): string => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    return `$${volume.toFixed(2)}`;
  };

  const formatTime = (ts: number): string => {
    const date = new Date(ts);
    return date.toLocaleTimeString();
  };

  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: 'rgba(15, 15, 24, 0.6)',
        border: '1px solid rgba(99, 102, 241, 0.2)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-purple-400" />
            Scanner Agent Feed
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Real-time candidate signals (advisory only)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
            connected
              ? 'bg-green-500/20 border border-green-500/50 text-green-400'
              : 'bg-red-500/20 border border-red-500/50 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className="text-xs font-semibold">
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          {lastUpdate && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Clock className="w-4 h-4" />
              {formatTime(lastUpdate)}
            </div>
          )}
        </div>
      </div>

      {/* Candidates List */}
      {candidates.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-semibold">No candidates yet</p>
          <p className="text-sm mt-2">
            Start the scanner agent in Settings → Agents
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {candidates.slice(0, 10).map((candidate, index) => (
            <div
              key={`${candidate.symbol}-${candidate.ts}-${index}`}
              className={`p-4 rounded-xl border-2 transition-all hover:border-purple-500/50 ${
                candidate.side === 'LONG'
                  ? 'bg-green-500/5 border-green-500/30'
                  : 'bg-red-500/5 border-red-500/30'
              }`}
            >
              <div className="flex items-start justify-between">
                {/* Left: Symbol & Side */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg font-bold ${
                      candidate.side === 'LONG'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {candidate.side === 'LONG' ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span className="text-sm">{candidate.side}</span>
                    </div>

                    <div className="text-lg font-bold">{candidate.symbol}</div>

                    <div className="text-sm text-slate-400">
                      {candidate.timeframe}
                    </div>
                  </div>

                  {/* Reasons */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(candidate.reasons || []).map((reason, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-lg text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right: Scores & Metadata */}
                <div className="flex flex-col items-end gap-2 ml-4">
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Score</div>
                      <div className="text-lg font-bold text-purple-400">
                        {(candidate.score * 100).toFixed(0)}%
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-400">Confluence</div>
                      <div className="text-lg font-bold text-cyan-400">
                        {(candidate.confluence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 text-right">
                    <div>Rank: #{candidate.rank}</div>
                    <div>Vol: {formatVolume(candidate.volumeUSD)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Note */}
      <div className="mt-4 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
        <p className="text-xs text-slate-400">
          <strong>Advisory Only:</strong> Scanner provides candidate signals for manual review.
          It does not execute trades automatically. Always perform your own analysis before trading.
        </p>
      </div>
    </div>
  );
};

export default ScannerFeedPanel;
