# Windows Setup & Fix Guide

Complete guide to fix common Windows development issues including `patch-package not found (exit code 127)` and native bindings for `better-sqlite3`.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Clean Install](#clean-install)
- [Fix better-sqlite3 Native Bindings](#fix-better-sqlite3-native-bindings)
- [Run the Application](#run-the-application)
- [One-Shot Setup Script](#one-shot-setup-script)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Install these tools **once** before setting up the project. Open **PowerShell as Administrator** and run:

```powershell
# Node.js LTS + Python + Visual Studio Build Tools (with C++ workload)
winget install OpenJS.NodeJS.LTS -s winget --accept-source-agreements --accept-package-agreements
winget install Python.Python.3.10 -s winget --accept-source-agreements --accept-package-agreements
winget install Microsoft.VisualStudio.2022.BuildTools -s winget --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --norestart"
```

**Important**: After installation, **restart Windows** to ensure all environment variables are properly set.

### Verify Installation

Open a fresh **PowerShell as Administrator** and verify:

```powershell
node -v        # Should show v18.x.x or higher
npm -v         # Should show 9.x.x or higher
python --version   # Should show Python 3.10.x

# Configure npm to use Visual Studio 2022
npm config set msvs_version 2022
```

---

## Clean Install

Navigate to your project root and perform a clean installation:

```powershell
cd "C:\path\to\DreammakerCryptoSignalAndTrader"

# Clean existing installation
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
Remove-Item -Force yarn.lock -ErrorAction SilentlyContinue
Remove-Item -Force pnpm-lock.yaml -ErrorAction SilentlyContinue
npm cache clean --force

# Ensure patch-package exists (for future use)
npm install -D patch-package

# Add postinstall script if missing
npm set-script postinstall "patch-package"

# Install all dependencies (DO NOT use --ignore-scripts)
npm install
```

**Note**: The `--ignore-scripts` flag should be avoided unless you have specific issues, as it prevents necessary build scripts from running.

---

## Fix better-sqlite3 Native Bindings

If the server fails to start with errors related to `better-sqlite3`, follow these steps:

### Option 1: Rebuild from Source

```powershell
# Force rebuild better-sqlite3 from source
npm rebuild better-sqlite3 --build-from-source

# Quick sanity check
node -e "require('better-sqlite3'); console.log('better-sqlite3 OK')"
```

### Option 2: Update to Latest Version

If rebuilding doesn't work, try updating to the latest version:

```powershell
# Update to latest version
npm install better-sqlite3@latest

# Rebuild from source
npm rebuild better-sqlite3 --build-from-source

# Verify
node -e "require('better-sqlite3'); console.log('better-sqlite3 OK')"
```

### Electron Projects Only

If you're building an Electron app, specify the Electron runtime:

```powershell
npm install better-sqlite3 --build-from-source --runtime=electron --target=<your-electron-version>
```

Replace `<your-electron-version>` with your actual Electron version (e.g., `25.0.0`).

---

## Run the Application

After successful installation and rebuilding, start the application:

```powershell
# Development mode (starts both frontend and backend)
npm run dev

# Or use the Windows-specific script with enhanced features
npm run dev:win

# Or start components separately
npm run dev:server   # Backend only
npm run dev:client   # Frontend only
```

**Access the application**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8001
- WebSocket: ws://localhost:8001

---

## One-Shot Setup Script

Use this complete script in **PowerShell as Administrator** at your project root for automated setup:

```powershell
# Navigate to project directory
cd "C:\path\to\DreammakerCryptoSignalAndTrader"

# Clean existing installation
Write-Host "Cleaning existing installation..." -ForegroundColor Cyan
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
Remove-Item -Force yarn.lock -ErrorAction SilentlyContinue
Remove-Item -Force pnpm-lock.yaml -ErrorAction SilentlyContinue
npm cache clean --force

# Configure build tools
Write-Host "Configuring build tools..." -ForegroundColor Cyan
npm config set msvs_version 2022

# Install patch-package
Write-Host "Installing patch-package..." -ForegroundColor Cyan
npm install -D patch-package

# Add postinstall script if missing
Write-Host "Configuring postinstall script..." -ForegroundColor Cyan
try {
  $pkg = Get-Content package.json -Raw | ConvertFrom-Json
  if (-not $pkg.scripts.postinstall) {
    npm set-script postinstall "patch-package"
  }
} catch {
  npm set-script postinstall "patch-package"
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

# Rebuild native dependencies
Write-Host "Rebuilding better-sqlite3..." -ForegroundColor Cyan
npm rebuild better-sqlite3 --build-from-source

# Smoke test
Write-Host "Testing better-sqlite3..." -ForegroundColor Cyan
node -e "require('better-sqlite3'); console.log('better-sqlite3 OK')"

# Start development server
Write-Host "`nSetup complete! Starting development server..." -ForegroundColor Green
npm run dev
```

**To use this script**:
1. Copy the script above
2. Replace `C:\path\to\DreammakerCryptoSignalAndTrader` with your actual project path
3. Paste into **PowerShell as Administrator**
4. Press Enter and wait for completion

---

## Troubleshooting

### node-gyp / MSB8020 / VCBuild Errors

**Symptoms**: Build fails with errors like:
- `error MSB8020: The build tools for v142 cannot be found`
- `gyp ERR! stack Error: Could not find any Visual Studio installation`
- `error C1083: Cannot open include file: 'node.h'`

**Solution**:
1. Ensure **Visual Studio 2022 Build Tools** with **C++ workload** is installed
2. Install **Windows 10/11 SDK** if missing:
   ```powershell
   winget install Microsoft.WindowsSDK.10.0.22621
   ```
3. Reopen **PowerShell as Administrator** (important!)
4. Run the clean install steps again

### Prebuild Download Fails (Proxy/Firewall)

**Symptoms**: npm fails to download prebuilt binaries with network errors

**Solution**:
```powershell
# Ensure using official npm registry
npm config set registry https://registry.npmjs.org/

# If behind a corporate proxy, configure:
# npm config set proxy http://user:pass@host:port
# npm config set https-proxy http://user:pass@host:port

# Then retry installation
npm install
```

### Changed Node Version Recently

**Symptoms**: App worked before but fails after updating Node.js

**Solution**:
```powershell
# Clean and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
npm rebuild better-sqlite3 --build-from-source
```

### Package Manager Mismatch

**Symptoms**: Multiple lock files exist (npm, yarn, pnpm)

**Solution**:
- If the repo has `yarn.lock`: Use `yarn install` instead of `npm install`
- If the repo has `pnpm-lock.yaml`:
  ```powershell
  corepack enable
  pnpm install
  ```
- **For this project**: We use **npm**, so stick with `npm install`
- **Important**: Still add `patch-package` regardless of package manager:
  ```powershell
  npm install -D patch-package   # or yarn add -D patch-package
  ```

### No `patches/` Folder but `postinstall: patch-package` Exists

**Symptoms**: Warning like `No patch files found`

**Solutions**:
1. **If you don't need patches**: This is normal and can be ignored
2. **If you created patches elsewhere**: Move them to `patches/` directory
3. **To remove the warning**: Temporarily remove the postinstall script:
   ```powershell
   npm pkg delete scripts.postinstall
   ```

### better-sqlite3 Still Fails After Rebuild

**Symptoms**: `Error: The module was compiled against a different Node.js version`

**Solutions**:

1. **Clear npm cache and rebuild**:
   ```powershell
   npm cache clean --force
   Remove-Item -Recurse -Force node_modules/better-sqlite3
   npm install better-sqlite3
   npm rebuild better-sqlite3 --build-from-source
   ```

2. **Install specific version**:
   ```powershell
   npm install better-sqlite3@9.2.2 --build-from-source
   ```

3. **Check Node.js version compatibility**:
   ```powershell
   node -v   # Ensure >= 18.0.0
   ```

### Port Already in Use (EADDRINUSE)

**Symptoms**: `Error: listen EADDRINUSE: address already in use :::8001`

**Solutions**:

1. **Kill process using the port**:
   ```powershell
   # Find and kill process on port 8001
   netstat -ano | findstr :8001
   # Note the PID, then:
   taskkill /PID <PID> /F
   ```

2. **Or change the port** in `.env`:
   ```env
   PORT=8002
   ```

### WebSocket Connection Fails

**Symptoms**: Frontend can't connect to backend WebSocket

**Solutions**:
1. Ensure backend is running: `npm run dev:server`
2. Check firewall settings for port 8001
3. Verify WebSocket URL in frontend matches backend URL
4. Check Windows Firewall:
   ```powershell
   # Allow Node.js through firewall
   New-NetFirewallRule -DisplayName "Node.js" -Direction Inbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow
   ```

### TypeScript Build Errors

**Symptoms**: Build fails with TypeScript compilation errors

**Solutions**:
```powershell
# Run type checking to see all errors
npm run typecheck

# Ensure all dependencies are installed
npm install

# Clear TypeScript cache
Remove-Item -Recurse -Force node_modules/.cache -ErrorAction SilentlyContinue
npm run build
```

### Performance Issues (Slow Installation)

**Solutions**:
1. **Disable Windows Defender for node_modules** (temporarily):
   - Add project folder to exclusions in Windows Security
2. **Use faster disk**: Install on SSD instead of HDD
3. **Close other applications**: Free up RAM and CPU

---

## Additional Resources

- **Main README**: See [README.md](../README.md) for general setup
- **API Documentation**: See [docs/](.) for detailed API guides
- **npm better-sqlite3**: https://github.com/WiseLibs/better-sqlite3
- **patch-package**: https://github.com/ds300/patch-package
- **Windows Build Tools**: https://github.com/nodejs/node-gyp#on-windows

---

## Need Help?

If you encounter issues not covered in this guide:

1. **Check the error stack carefully** - Most errors indicate the exact problem
2. **Search GitHub Issues**: https://github.com/nimazasinich/DreammakerCryptoSignalAndTrader/issues
3. **Provide details when asking for help**:
   - Full error stack trace
   - Your Node.js and npm versions
   - Your project path
   - Whether a `patches/` directory exists
   - Steps you've already tried

---

**Last Updated**: 2025-11-09
**Tested On**: Windows 10/11, Node.js 18.x - 20.x, npm 9.x - 10.x
