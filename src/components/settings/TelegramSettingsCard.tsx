import React, { useEffect, useState } from 'react';
import { Send, Save, Settings } from 'lucide-react';
import axios from 'axios';
import { Logger } from '../../core/Logger.js';
import { showToast } from '../ui/Toast';
import { useConfirmModal } from '../ui/ConfirmModal';

type Flags = {
  signals: boolean;
  positions: boolean;
  liquidation: boolean;
  success: boolean;
};

type ConfigOut = {
  enabled: boolean;
  configured: boolean;
  chat_id_preview?: string | null;
  flags: Flags;
};

const api = import.meta.env.VITE_API_BASE || '/api';
const logger = Logger.getInstance();

export default function TelegramSettingsCard() {
  const { confirm, ModalComponent } = useConfirmModal();
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [flags, setFlags] = useState<Flags>({
    signals: true,
    positions: true,
    liquidation: true,
    success: true
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await axios.get<ConfigOut>(`${api}/telegram/config`);
        setEnabled(data.enabled);
        setFlags(data.flags);
        setPreview(data.chat_id_preview ?? null);
        setConfigured(data.configured);
      } catch (error) {
        logger.error('Failed to load Telegram config:', {}, error as Error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setLoading(true);
    try {
      await axios.post(`${api}/telegram/config`, {
        enabled,
        bot_token: botToken || undefined,
        chat_id: chatId || undefined,
        flags
      });
      const { data } = await axios.get<ConfigOut>(`${api}/telegram/config`);
      setEnabled(data.enabled);
      setFlags(data.flags);
      setPreview(data.chat_id_preview ?? null);
      setConfigured(data.configured);
      setBotToken('');
      setChatId('');
      showToast('success', 'Settings Saved', 'Telegram settings updated successfully');
    } catch (error) {
      showToast('error', 'Save Failed', 'Failed to save Telegram settings');
      logger.error('Failed to save Telegram config:', {}, error as Error);
    } finally {
      setLoading(false);
    }
  };

  const test = async () => {
    setLoading(true);
    try {
      await axios.post(`${api}/telegram/test`);
      showToast('success', 'Test Sent', 'Test notification sent to Telegram');
    } catch (error) {
      showToast('error', 'Test Failed', 'Failed to send test message');
      logger.error('Failed to send test message:', {}, error as Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ModalComponent />
      <div
        className="mb-6 p-6 rounded-xl"
        style={{
          background: 'rgba(15, 15, 24, 0.6)',
          border: '1px solid rgba(99, 102, 241, 0.2)'
        }}
      >
        <div className="mb-4">
        <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
          <Settings className="w-6 h-6 text-purple-400" />
        Telegram notifications
        </h3>
        <p className="text-sm text-slate-400">
        Enable notifications and manage Telegram bot delivery
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-5 h-5 rounded"
          />
          <span className="text-slate-300">Enable Telegram alerts</span>
        </label>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-2 text-slate-400">Bot Token</label>
            <input
              type="password"
              className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500"
              placeholder="Enter bot token"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-2 text-slate-400">Chat ID</label>
            <input
              className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500"
              placeholder="Enter chat id"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
            />
            {preview && (
              <div className="text-xs opacity-60 mt-1 text-slate-400">
                Configured: {preview}
              </div>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(['signals', 'positions', 'liquidation', 'success'] as (keyof Flags)[]).map((k) => (
            <label key={k} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={flags[k]}
                onChange={(e) => setFlags({ ...flags, [k]: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-slate-300 capitalize">
                {k === 'signals' && 'Signals'}
                {k === 'positions' && 'Positions'}
                {k === 'liquidation' && 'Liquidation risk'}
                {k === 'success' && 'Execution results'}
              </span>
            </label>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            className="px-6 py-2 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:shadow-lg hover:shadow-emerald-500/50 transition-all flex items-center gap-2 disabled:opacity-50"
            disabled={loading}
            onClick={save}
          >
            <Save className="w-4 h-4" />
          Save
          </button>
          <button
            className="px-6 py-2 rounded-xl font-bold bg-slate-800/50 border border-slate-700/50 hover:border-purple-500/50 transition-all flex items-center gap-2 disabled:opacity-50"
            disabled={loading || !configured}
            onClick={test}
          >
            <Send className="w-4 h-4" />
          Send test
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

