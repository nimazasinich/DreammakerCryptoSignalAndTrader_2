# End-to-End Verification Script

## Overview

This verification script (`scripts/verify_full.mjs`) performs a complete end-to-end functional verification of the crypto trading console application.

## What It Does

1. **Checks Node.js version** (requires 18+)
2. **Installs dependencies** via `npm install`
3. **Ensures environment** (creates/updates `.env.local` with correct `VITE_API_BASE` and `VITE_WS_BASE`)
4. **Starts backend** (Express server on port 3001) using `tsx src/server.ts`
5. **Verifies backend health** via `GET /api/health`
6. **Builds frontend** via `npm run build:frontend`
7. **Starts frontend preview** (Vite preview on port 5173)
8. **Verifies frontend health** via `GET /`
9. **Additional checks** (system status endpoint)
10. **Generates report** (`artifacts/functional_report.json`)

## Usage

From the repository root:

```bash
npm run verify
```

## Output

The script creates:

- `artifacts/backend.log` - Backend server logs
- `artifacts/frontend.log` - Frontend build and preview logs
- `artifacts/npm.log` - npm install logs
- `artifacts/functional_report.json` - Machine-readable verification report

## Success Criteria

- ✅ Backend responds with HTTP 200 on `http://localhost:3001/api/health`
- ✅ Frontend responds with HTTP 200 on `http://localhost:5173/`
- ✅ All steps complete without errors
- ✅ Exit code 0 on success

## Notes

- The script automatically cleans up spawned processes on exit
- Backend runs on port 3001 (configurable via `PORT` env var)
- Frontend preview runs on port 5173
- The script is cross-platform (Windows/macOS/Linux)

## Troubleshooting

If verification fails:

1. Check `artifacts/functional_report.json` for detailed error information
2. Review logs in `artifacts/` directory
3. Ensure ports 3001 and 5173 are not already in use
4. Verify Node.js version: `node -v` (should be 18+)

