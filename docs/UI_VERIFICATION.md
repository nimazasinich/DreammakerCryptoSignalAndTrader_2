# UI Coherence Verification

## Overview

This verification system uses Playwright and Axe to audit the UI for:
- RTL (Right-to-Left) direction enforcement
- Dark theme consistency
- Glassmorphism panel styling
- Accessibility compliance
- Responsive design
- Visual consistency

## Setup

Install Playwright browsers:

```bash
npx playwright install
```

## Usage

### Run UI Tests

```bash
npm run ui:verify
```

This will:
1. Build the frontend (`npm run build:frontend`)
2. Start Vite preview server (port 5173)
3. Run Playwright tests
4. Generate HTML report and screenshots

### Run Tests Only (if preview server already running)

```bash
npm run ui:test
```

## Tests

The tests verify:

1. **No Console Errors** - Pages load without JavaScript errors
2. **RTL Direction** - `dir="rtl"` is set on HTML element
3. **Dark Theme** - Background colors are dark
4. **Glassmorphism Panels** - Cards/panels have blur, border, radius effects
5. **Accessibility** - Axe scan finds < 3 critical/serious violations
6. **Responsive** - No horizontal overflow on mobile/desktop
7. **Screenshots** - Visual captures for review

## Tested Pages

- Dashboard (`/`)
- Scanner (via navigation)
- Settings (via navigation)

## Artifacts

- `artifacts/ui/report/` - HTML test report
- `artifacts/ui/report.json` - JSON test results
- `artifacts/ui/screenshots/` - Screenshots per page/viewport

## Configuration

- Desktop: 1440×900 viewport
- Mobile: 390×844 viewport (Pixel 7)
- Base URL: `http://localhost:5173`

## Style Fixes Applied

- ✅ Added `dir="rtl"` to `index.html`
- ✅ Created `src/styles/glass.css` with normalized panel styles
- ✅ Imported glass styles in `src/index.css` and `src/main.tsx`

## Troubleshooting

If tests fail:

1. Check `artifacts/ui/report/index.html` for detailed failure information
2. Review screenshots in `artifacts/ui/screenshots/`
3. Ensure backend is running on port 3001 (for API calls)
4. Verify frontend preview server started successfully

