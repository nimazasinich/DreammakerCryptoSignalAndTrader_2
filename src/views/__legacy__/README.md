# Legacy Views Archive

This directory contains archived/legacy view files that have been replaced by better implementations.

**DO NOT USE THESE FILES IN PRODUCTION**

## Archived Files

### StrategyLabView.tsx
- **Archived Date:** 2025-11-14
- **Reason:** Replaced by EnhancedStrategyLabView.tsx
- **Details:** EnhancedStrategyLabView has significantly more features:
  - Live preview mode with debouncing
  - Saved strategies management (save/load/run/delete)
  - Performance metrics with realistic calculations
  - Export/import JSON configurations
  - PerformanceChart component
  - LocalStorage persistence
  - Better UI/UX with more detailed comparisons
- **Current Usage:** App.tsx imports EnhancedStrategyLabView (lines 57-62) and uses it for the 'strategylab' route

### SVG_Icons.tsx
- **Archived Date:** 2025-11-14
- **Reason:** Duplicate of src/components/SVG_Icons.tsx
- **Details:** This file was located in views/ instead of components/ and is identical to the component version
- **Current Usage:** None. Use lucide-react icons or src/components/SVG_Icons.tsx

## Why Keep These Files?

Legacy files are archived rather than deleted to:
1. Preserve git history and context
2. Allow easy comparison with current implementations
3. Enable rollback if critical issues are discovered
4. Document evolution of the codebase

## Migration History

Moved files:
- `src/views/StrategyLabView.tsx` → `src/views/__legacy__/StrategyLabView.tsx`
- `src/views/SVG_Icons.tsx` → `src/views/__legacy__/SVG_Icons.tsx`

## Related Documentation

See `/AUDIT_REPORT.md` for full analysis and rationale.
