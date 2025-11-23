// Integration Settings - Secure API and Telegram token management
import React, { useEffect, useState } from 'react';
import { Send, Save, Settings, Key, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../../config/env';

interface CredentialsStatus {
  telegram: {
    configured: boolean;
    chatIdMasked?: string;
  };
  binance: {
    configured: boolean;
  };
}

export default function IntegrationSettings() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<CredentialsStatus | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [binanceApiKey, setBinanceApiKey] = useState('');
  const [binanceSecretKey, setBinanceSecretKey] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const { data } = await axios.get<CredentialsStatus>(`${API_BASE}/admin/creds/status`);
      if ((data as any).success !== undefined) {
        // Response has success wrapper
        setStatus((data as any).telegram ? data as CredentialsStatus : null);
      } else {
        setStatus(data);
      }
    } catch (error: any) {
      console.error('Failed to load credentials status:', error);
    }
  };

  const saveCredentials = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const payload: any = {};
      if (telegramBotToken) payload.telegramBotToken = telegramBotToken;
      if (telegramChatId) payload.telegramChatId = telegramChatId;
      if (binanceApiKey) payload.binanceApiKey = binanceApiKey;
      if (binanceSecretKey) payload.binanceSecretKey = binanceSecretKey;

      await axios.post(`${API_BASE}/admin/creds`, payload);

      setMessage({ type: 'success', text: 'Credentials saved securely' });
      setTelegramBotToken('');
      setTelegramChatId('');
      setBinanceApiKey('');
      setBinanceSecretKey('');

      // Reload status
      await loadStatus();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to save credentials'
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTestAlert = async () => {
    setLoading(true);
    setMessage(null);

    try {
      await axios.post(`${API_BASE}/notify/test`);
      setMessage({ type: 'success', text: 'Test alert sent successfully!' });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to send test alert'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Settings className="w-7 h-7 text-purple-400" />
          Integration Settings
        </h2>
        <p className="text-slate-400">
          Securely configure API keys and Telegram notifications. All credentials are encrypted server-side.
        </p>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Telegram Configuration */}
      <div
        className="p-6 rounded-xl"
        style={{
          background: 'rgba(15, 15, 24, 0.6)',
          border: '1px solid rgba(99, 102, 241, 0.2)'
        }}
      >
        <div className="mb-4">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-400" />
            Telegram Bot Configuration
          </h3>
          {status?.telegram.configured ? (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle className="w-4 h-4" />
              Configured
              {status.telegram.chatIdMasked && (
                <span className="text-slate-400">
                  (Chat ID: {status.telegram.chatIdMasked})
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Not configured</p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2 text-slate-400">
              Bot Token <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none transition-colors"
              placeholder="Enter Telegram bot token (write-only)"
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">
              Get your bot token from @BotFather on Telegram
            </p>
          </div>

          <div>
            <label className="block text-sm mb-2 text-slate-400">
              Chat ID <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none transition-colors"
              placeholder="Enter your Telegram chat ID"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">
              Get your chat ID from @userinfobot on Telegram
            </p>
          </div>
        </div>
      </div>

      {/* Binance Configuration (Optional) */}
      <div
        className="p-6 rounded-xl"
        style={{
          background: 'rgba(15, 15, 24, 0.6)',
          border: '1px solid rgba(99, 102, 241, 0.2)'
        }}
      >
        <div className="mb-4">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Key className="w-5 h-5 text-yellow-400" />
            Binance API Keys (Optional)
          </h3>
          {status?.binance.configured ? (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle className="w-4 h-4" />
              Configured
            </div>
          ) : (
            <p className="text-sm text-slate-400">Not configured</p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2 text-slate-400">API Key</label>
            <input
              type="password"
              className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none transition-colors"
              placeholder="Enter Binance API key (optional)"
              value={binanceApiKey}
              onChange={(e) => setBinanceApiKey(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-slate-400">Secret Key</label>
            <input
              type="password"
              className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none transition-colors"
              placeholder="Enter Binance secret key (optional)"
              value={binanceSecretKey}
              onChange={(e) => setBinanceSecretKey(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
          onClick={saveCredentials}
        >
          <Save className="w-5 h-5" />
          Save Credentials
        </button>

        <button
          className="px-6 py-3 rounded-xl font-bold bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/50 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !status?.telegram.configured}
          onClick={sendTestAlert}
        >
          <Send className="w-5 h-5" />
          Send Test Alert
        </button>
      </div>

      {/* Security Note */}
      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm">
        <p className="font-semibold mb-1">🔒 Security Note</p>
        <p>
          All credentials are encrypted with AES-256-GCM before storage. Tokens are never exposed to the client.
          Make sure your TELEGRAM_STORE_SECRET environment variable is set securely.
        </p>
      </div>
    </div>
  );
}
