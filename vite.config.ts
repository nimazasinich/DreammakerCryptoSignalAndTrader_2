import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom']
  },
  server: {
    port: 5173,
    host: '127.0.0.1', // Force IPv4 to prevent ::1 EACCES errors on Windows
    strictPort: false,
    proxy: {
      '^/api($|/)': {
        target: 'http://127.0.0.1:8001', // Backend server on port 8001
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            // ECONNREFUSED is expected during server restarts (hot reload)
            if (err.code === 'ECONNREFUSED') {
              console.log('[Vite Proxy] Backend server is restarting, request will retry automatically');
            } else {
              console.error('[Vite Proxy] Error:', err.message);
            }
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Only log in development to reduce noise
            if (process.env.NODE_ENV === 'development') {
              console.log('[Vite Proxy] Sending Request:', req.method, req.url);
            }
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            // Only log errors and non-200 status codes
            if (proxyRes.statusCode >= 400 || process.env.NODE_ENV === 'development') {
              console.log('[Vite Proxy] Response:', proxyRes.statusCode, req.url);
            }
          });
        },
      },
      '/market': {
        target: 'http://127.0.0.1:8001', // Backend server on port 8001
        changeOrigin: true,
        secure: false,
      },
      '^/ws($|/)': {
        target: 'ws://127.0.0.1:8001', // WebSocket on port 8001
        ws: true,
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:8001', // Health check endpoint
        changeOrigin: true,
        secure: false,
      },
      '/status': {
        target: 'http://127.0.0.1:8001', // Status endpoint
        changeOrigin: true,
        secure: false,
      },
      '/system': {
        target: 'http://127.0.0.1:8001', // System endpoints
        changeOrigin: true,
        secure: false,
      },
      '/signals': {
        target: 'http://127.0.0.1:8001', // Signals endpoint
        changeOrigin: true,
        secure: false,
      },
      '/proxy': {
        target: 'http://127.0.0.1:8001', // Proxy endpoints
        changeOrigin: true,
        secure: false,
      },
      '/binance': {
        target: 'http://127.0.0.1:8001', // Binance endpoints
        changeOrigin: true,
        secure: false,
      },
      '/coingecko': {
        target: 'http://127.0.0.1:8001', // CoinGecko endpoints
        changeOrigin: true,
        secure: false,
      },
      '/providers': {
        target: 'http://127.0.0.1:8001', // Provider endpoints
        changeOrigin: true,
        secure: false,
      },
      '/hf': {
        target: 'http://127.0.0.1:8001', // HuggingFace endpoints
        changeOrigin: true,
        secure: false,
      },
      '/config': {
        target: 'http://127.0.0.1:8001', // Config endpoints
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      external: (id) => {
        // Externalize Node.js built-in modules for browser builds
        if (id === 'fs' || id === 'path' || id.startsWith('fs/') || id.startsWith('path/')) {
          return true;
        }
        return false;
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['lucide-react']
        }
      }
    }
  },
  preview: {
    port: 5173,
    host: '127.0.0.1', // Force IPv4 to prevent ::1 EACCES errors on Windows
  }
});
