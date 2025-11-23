import React, { useState, useEffect } from 'react';
import { KuCoinFuturesService } from '../../services/KuCoinFuturesService';
import { Logger } from '../../core/Logger';
import { showToast } from '../ui/Toast';
import { useConfirmModal } from '../ui/ConfirmModal';

const logger = Logger.getInstance();

export const ExchangeSettings: React.FC = () => {
  const { confirm, ModalComponent } = useConfirmModal();
  const futuresService = KuCoinFuturesService.getInstance();
  
  const [exchanges, setExchanges] = useState<any[]>([
    { id: 'kucoin', name: 'KuCoin', active: true },
    { id: 'binance', name: 'Binance', active: false },
    { id: 'bybit', name: 'Bybit', active: false },
    { id: 'okx', name: 'OKX', active: false }
  ]);

  const [selectedExchange, setSelectedExchange] = useState('kucoin');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSavedCredentials();
  }, [selectedExchange]);

  const loadSavedCredentials = () => {
    try {
      const stored = localStorage.getItem('exchange_credentials');
      if (stored) {
        const creds = JSON.parse(stored);
        if (creds[selectedExchange]) {
          setApiKey(creds[selectedExchange].apiKey || '');
          setApiSecret('••••••••••••••••');
          setPassphrase('••••••••••••••••');
          setSaved(true);
        } else {
          clearForm();
        }
      }
    } catch (error) {
      logger.error('Failed to load exchange credentials', {}, error as Error);
    }
  };

  const clearForm = () => {
    setApiKey('');
    setApiSecret('');
    setPassphrase('');
    setSaved(false);
  };

  const handleSave = () => {
    if (!apiKey || !apiSecret) {
      showToast('warning', 'Missing Fields', 'API Key and Secret are required');
      return;
    }

    try {
      futuresService.saveCredentials(selectedExchange, {
        apiKey,
        apiSecret,
        passphrase
      });

      setSaved(true);
      showToast('success', 'Credentials Saved', 'API credentials saved successfully!');

      setApiSecret('••••••••••••••••');
      setPassphrase('••••••••••••••••');
    } catch (error) {
      showToast('error', 'Save Failed', 'Failed to save credentials');
    }
  };

  const handleSetActive = (exchangeId: string) => {
    futuresService.setActiveExchange(exchangeId);
    const updated = (exchanges || []).map(ex => ({
      ...ex,
      active: ex.id === exchangeId
    }));
    setExchanges(updated);
    localStorage.setItem('active_exchange', exchangeId);
    showToast('success', 'Exchange Activated', `${exchangeId.toUpperCase()} is now active`);
  };

  const handleDelete = async () => {
    const confirmed = await confirm('Delete Credentials', `Are you sure you want to delete credentials for ${selectedExchange.toUpperCase()}?`, 'danger');
    if (!confirmed) return;

    try {
      const stored = localStorage.getItem('exchange_credentials');
      if (stored) {
        const creds = JSON.parse(stored);
        delete creds[selectedExchange];
        localStorage.setItem('exchange_credentials', JSON.stringify(creds));
      }
      clearForm();
      showToast('success', 'Credentials Deleted', 'API credentials have been removed');
    } catch (error) {
      showToast('error', 'Delete Failed', 'Failed to delete credentials');
    }
  };

  return (
    <>
      <ModalComponent />
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-white">Exchange API Settings</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-gray-300">Select Exchange</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(exchanges || []).map(ex => (
            <button
              key={ex.id}
              onClick={() => setSelectedExchange(ex.id)}
              className={`p-3 rounded-lg border-2 transition ${
                selectedExchange === ex.id
                  ? 'border-blue-500 bg-blue-900/30'
                  : 'border-gray-600 bg-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="font-bold text-white">{ex.name}</div>
              {ex.active && (
                <div className="text-xs text-green-400 mt-1">● Active</div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-700 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            API Key
            <span className="text-red-400 ml-1">*</span>
          </label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter API Key"
            className="w-full bg-gray-800 text-white rounded px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            API Secret
            <span className="text-red-400 ml-1">*</span>
          </label>
          <input
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="Enter API Secret"
            className="w-full bg-gray-800 text-white rounded px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {selectedExchange === 'kucoin' && (
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Passphrase
              <span className="text-red-400 ml-1">*</span>
            </label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter Passphrase"
              className="w-full bg-gray-800 text-white rounded px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium transition"
          >
            Save Credentials
          </button>
          
          {saved && (
            <>
              <button
                onClick={() => handleSetActive(selectedExchange)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-medium transition"
              >
                Set as Active
              </button>
              
              <button
                onClick={handleDelete}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition"
              >
                Delete
              </button>
            </>
          )}
        </div>

        {saved && (
          <div className="bg-green-900/30 border border-green-500 rounded p-3 text-green-400 text-sm">
            ✓ Credentials saved for {selectedExchange.toUpperCase()}
          </div>
        )}
      </div>

      <div className="mt-6 bg-yellow-900/30 border border-yellow-500 rounded p-4">
        <h3 className="font-bold text-yellow-400 mb-2">⚠️ Security Notice</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Keep your API keys secure and never share them</li>
          <li>• Enable IP whitelist on your exchange account</li>
          <li>• Set appropriate API permissions (only trading, no withdrawals)</li>
          <li>• Use subaccounts with limited funds for trading</li>
          <li>• Regularly rotate your API keys</li>
        </ul>
      </div>

      <div className="mt-6 bg-gray-700 rounded p-4">
        <h3 className="font-bold text-white mb-3">How to get API Keys:</h3>
        <div className="space-y-3 text-sm text-gray-300">
          <div>
            <div className="font-bold text-blue-400 mb-1">KuCoin:</div>
            <div>1. Login to KuCoin → API Management</div>
            <div>2. Create API → Enable Futures Trading</div>
            <div>3. Set passphrase and save keys securely</div>
          </div>
          <div>
            <div className="font-bold text-yellow-400 mb-1">Binance:</div>
            <div>1. Login to Binance → API Management</div>
            <div>2. Create API → Enable Futures</div>
            <div>3. Set IP whitelist (recommended)</div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};
