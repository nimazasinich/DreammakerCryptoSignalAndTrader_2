import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ui/ErrorBoundary';
import './index.css';
import './styles/theme.css';

// CRITICAL: Enforce data policy at application startup
import { assertPolicy, APP_MODE, getDataSourceLabel } from './config/dataPolicy';

try {
  assertPolicy();
  console.log(`✅ Data policy validated successfully. Mode: ${APP_MODE}, Source: ${getDataSourceLabel()}`);
} catch (error) {
  console.error('❌ DATA POLICY VIOLATION:', error);
  // Display error to user and halt application
  document.getElementById('root')!.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: #1a1a1a;
      color: #fff;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 2rem;
    ">
      <div style="max-width: 600px; text-align: center;">
        <h1 style="color: #ef4444; font-size: 2rem; margin-bottom: 1rem;">⚠️ Configuration Error</h1>
        <p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 1rem;">
          ${error instanceof Error ? error.message : String(error)}
        </p>
        <p style="color: #9ca3af; font-size: 0.9rem;">
          Please check your environment configuration (.env file) and ensure the data policy settings are correct.
        </p>
      </div>
    </div>
  `;
  throw error;
}

// Guard for real backend only (no mocks) - ensure HTTPS/WSS URLs are configured
const apiBase = import.meta.env.VITE_API_BASE as string | undefined;
const wsBase = import.meta.env.VITE_WS_BASE as string | undefined;
const isDevelopment = import.meta.env.DEV;

if (!apiBase || !/^https:\/\//.test(apiBase)) {
  if (isDevelopment) {
    console.warn('⚠️ Development mode: Using HTTP/WS (localhost). Production requires HTTPS/WSS.');
    console.log(`Current VITE_API_BASE: ${apiBase || 'undefined'}`);
    console.log(`Current VITE_WS_BASE: ${wsBase || 'undefined'}`);
  } else {
    console.error('❌ Backend not configured. Set VITE_API_BASE (HTTPS) and VITE_WS_BASE (WSS) via repo variables.');
    console.error(`Current VITE_API_BASE: ${apiBase || 'undefined'}`);
    console.error(`Current VITE_WS_BASE: ${wsBase || 'undefined'}`);
  }
}

createRoot(document.getElementById('root')!).render(
  // Temporarily disabled StrictMode to prevent double-renders in development
  // <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  // </StrictMode>
);
