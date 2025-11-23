# One-Command Setup & Run

## Overview

This script provides a single command to install dependencies, configure environment, and start both backend and frontend servers.

## Quick Start

From the repository root:

```bash
npm run start:all
```

This single command will:
1. ✅ Install all npm dependencies
2. ✅ Create/update `.env.local` with correct API endpoints
3. ✅ Build the frontend production bundle
4. ✅ Start backend server (Express on port 3001)
5. ✅ Start frontend preview (Vite on port 5173)
6. ✅ Verify health of both servers
7. ✅ Keep both running until Ctrl+C

## Commands

### `npm run start:all`

Full startup: installs dependencies, builds, and starts both servers.

### `npm run setup`

Setup only: installs dependencies and configures environment without starting servers (useful for CI).

## What Gets Started

- **Backend**: Express/Node.js server on port **3001**
  - Health endpoint: `http://localhost:3001/api/health`
  - Uses `tsx` to run TypeScript directly

- **Frontend**: Vite preview server on port **5173**
  - Serves production build
  - URL: `http://localhost:5173/`

## Environment Configuration

The script automatically creates/updates `.env.local` with:

```
VITE_API_BASE=http://localhost:3001/api
VITE_WS_BASE=http://localhost:3001
```

## Stopping

Press `Ctrl+C` to gracefully stop both servers.

## Troubleshooting

### Port Already in Use

If port 3001 or 5173 is already in use:

```bash
# Windows
netstat -ano | findstr :3001
netstat -ano | findstr :5173

# macOS/Linux
lsof -i :3001
lsof -i :5173
```

Kill the process or change the port via environment variables:

```bash
PORT=3002 npm run start:all
```

### Backend Fails to Start

- Check `src/server.ts` exists and is valid
- Ensure no syntax errors in TypeScript
- Verify port 3001 is available

### Frontend Build Fails

- Check Node.js version (18+ required)
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run build:frontend`

## Output

The script provides clear console output:
- ✅ Progress indicators for each step
- ✅ Health check confirmations
- ✅ Ready banner with URLs
- ❌ Error messages if anything fails

## Cross-Platform

Works on:
- ✅ Windows (PowerShell/CMD)
- ✅ macOS
- ✅ Linux

Uses native Node.js APIs and cross-platform spawn options.

