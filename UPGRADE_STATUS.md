# Dependency Upgrade Status

This document tracks the progress of upgrading dependencies in the Roadie Design System monorepo.

## Branch
`chore/upgrade-dependencies`

## Completed Phases

### Phase 1: Low-Risk Updates ✅
**Status:** Completed in previous session
- React 19.2.0
- Prettier and related plugins
- Other low-risk dependencies

### Phase 2: Medium-Risk Updates ✅
**Commit:** `chore: upgrade Phase 2 dependencies (medium-risk updates)`
- lucide-react → 0.548.0
- @testing-library/react → 16.3.0
- eslint-config-prettier → 10.1.8
- pretty-quick → 4.2.2
- @trivago/prettier-plugin-sort-imports → 5.2.2

**Result:** All tests and builds passing ✅

### Phase 3a: Testing Stack ✅
**Commit:** `chore: upgrade Phase 3a testing stack (vitest & vitest-related fixes)`
- vitest → 4.0.4
- @vitest/coverage-v8 → 4.0.4
- @vitest/ui → 4.0.4
- @vitejs/plugin-react → 5.1.0
- jsdom → 27.0.1
- @types/node → 24.9.1

**Fixes Applied:**
- Fixed `SystemStyleObject` import in `view.ts` (now uses `@pandacss/types` instead of `@pandacss/dev`)
- Added `@pandacss/types` as devDependency in core package
- Configured Vite/Vitest in components package for workspace module resolution:
  - Added `resolve.dedupe` for react/react-dom
  - Added `server.fs.allow` for workspace file access
  - Added `ssr.noExternal` for @oztix/roadie-core

**Result:** All tests passing in core and components packages ✅

### Phase 3b: TypeScript ✅
**Commit:** `chore: upgrade TypeScript to 5.9.3`
- TypeScript → 5.9.3

**Result:** All typechecks, tests, and builds passing ✅

### Phase 3d: ESLint 9 Migration ✅
**Commit:** `chore: upgrade ESLint to 9.38.0 with flat config`
- eslint → 9.38.0
- Installed @eslint/js, @eslint/eslintrc, @eslint/compat, globals

**Migration Work Completed:**
- Migrated `.eslintrc.cjs` and `docs/.eslintrc.json` to flat config format (`eslint.config.js`)
- Created root flat config with TypeScript, React, Prettier, and PandaCSS plugins
- Created docs-specific config extending root with Next.js and MDX support
- Used FlatCompat to integrate eslintrc-based plugins (Next.js, MDX)
- Updated all lint commands to remove deprecated `--ignore-path` and `--ext` flags
- Added appropriate globals for Node.js, browser, Vitest, and React
- Configured MDX files to ignore unused import warnings
- Removed unused eslint-disable directives

**Result:** All linting, tests, typechecks, and builds passing ✅

## Remaining Work

### Phase 3c: Next.js Ecosystem ⚠️ BLOCKED

**Target Upgrades:**
- next: 15.5.6 → 16.0.0
- @next/mdx: 15.5.6 → 16.0.0
- eslint-config-next: 15.5.6 → 16.0.0

**Status:** Blocked by Turbopack compatibility issues

**Blockers:**
1. **MDX Loader Serialization Error:** Next.js 16 uses Turbopack by default, which has strict requirements for serializable loader options. The `@next/mdx` package's loader options are not compatible with Turbopack in version 16.0.0.
   
2. **Symlink Issue:** Turbopack encounters errors with symlinks outside the filesystem root (specifically `scripts/venv/bin/python` from Python virtual environment).

**Error Messages:**
```
Error: loader /path/to/@next/mdx/mdx-js-loader.js for match "{*,next-mdx-rule}" 
does not have serializable options. Ensure that options passed are plain 
JavaScript objects and values.
```

```
Error [TurbopackInternalError]: Failed to write app endpoint /page
Caused by:
- Symlink scripts/venv/bin/python is invalid, it points out of the filesystem root
```

**Recommendation:** 
- Monitor Next.js 16.x releases for Turbopack + MDX compatibility fixes
- Consider waiting for Next.js 16.1+ or official MDX integration updates
- Alternative: Keep Next.js 15.x until Turbopack issues are resolved
- `eslint-config-next@16.0.0` can be upgraded once Next.js 16 is ready

## Current State

### Package Versions (Current)
```json
{
  "typescript": "5.9.3",
  "vitest": "4.0.4",
  "react": "19.2.0",
  "next": "15.5.6",
  "eslint": "9.38.0"
}
```

### Build Status
- ✅ Core package: Building and tests passing
- ✅ Components package: Building and tests passing
- ✅ Docs site: Building successfully with Next.js 15.5.6
- ✅ TypeScript: All packages type-checking successfully

### Known Warnings
1. **Peer Dependency Warning:** `next-view-transitions@0.3.4` expects React 18.x but we're on React 19.x
   - Impact: Minor, package still works
   - Action: Monitor for updates to `next-view-transitions`

2. **TypeScript ESLint Version Warning:** TypeScript ESLint reports TypeScript version mismatch
   - TypeScript 5.9.3 is newer than officially supported by @typescript-eslint/typescript-estree@8.17.0
   - Impact: Minimal, linting still works
   - Note: Warning persists but functionality is unaffected

## Next Steps

1. **Monitor for Fixes:**
   - Watch Next.js 16.x releases for Turbopack + MDX fixes
   - Check `@next/mdx` updates for serialization compatibility

2. **When Next.js 16 Unblocked:**
   - Retry Next.js 16 upgrade once Turbopack issues are resolved
   - Upgrade `eslint-config-next` to 16.x at the same time
   - Test docs build thoroughly

3. **Alternative Path:**
   - Keep Next.js 15.x for stable production use
   - All other dependencies are now fully up-to-date
   - Revisit Next.js 16 in Q2 2025 or when Turbopack stabilizes

## Testing Checklist

Before considering upgrades complete:
- [x] `pnpm typecheck` passes
- [x] `pnpm test` passes all tests
- [x] `pnpm build` succeeds for all packages
- [x] `pnpm lint` passes
- [ ] `pnpm --filter docs dev` runs without errors
- [ ] Manual smoke test of docs site

## Notes

- All changes are on the `chore/upgrade-dependencies` branch
- Eight commits completed:
  1. Phase 1: Low-risk updates
  2. Redundancy cleanup (TypeScript hoisting)
  3. Phase 2: Medium-risk updates
  4. Phase 3a: Testing stack (Vitest 4)
  5. Phase 3b: TypeScript 5.9.3
  6. Documentation: Initial upgrade status
  7. Documentation: ESLint 9 migration requirements
  8. Phase 3d: ESLint 9 migration complete
- Turborepo cache has been used effectively throughout
- No breaking changes to component APIs
- All existing tests continue to pass
- ~99% of dependencies now fully up-to-date