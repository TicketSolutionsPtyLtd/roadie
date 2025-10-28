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

### Phase 3d: ESLint 9 Migration ⚠️ HIGH RISK

**Current Version:** eslint@8.57.1 (in docs package)
**Latest Version:** eslint@9.38.0

**Status:** Not started - requires significant configuration migration

**Requirements:**
- Migrate from `.eslintrc.json` to flat config (`eslint.config.js`)
- Update ESLint plugin configurations for ESLint 9 compatibility
- Update `eslint-config-next` to 16.x (which requires ESLint 9+)
- Test all linting rules and fix any breaking changes

**Note:** `eslint-config-next@16.0.0` requires `eslint@>=9.0.0` (peer dependency warning present)

**Recommendation:**
- Perform as a separate PR after Next.js 16 is unblocked
- Allow time for thorough testing of linting rules
- Update all ESLint plugins to versions compatible with ESLint 9

## Current State

### Package Versions (Current)
```json
{
  "typescript": "5.9.3",
  "vitest": "4.0.4",
  "react": "19.2.0",
  "next": "15.5.6",
  "eslint": "8.57.1"
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

2. **ESLint Version Warning:** TypeScript ESLint reports TypeScript version mismatch
   - TypeScript 5.9.3 is newer than officially supported by @typescript-eslint/typescript-estree@8.17.0
   - Impact: Minimal, linting still works
   - Will be resolved when upgrading ESLint ecosystem

## Next Steps

1. **Monitor for Fixes:**
   - Watch Next.js 16.x releases for Turbopack + MDX fixes
   - Check `@next/mdx` updates for serialization compatibility

2. **When Unblocked:**
   - Retry Next.js 16 upgrade once Turbopack issues are resolved
   - Test docs build thoroughly
   - Proceed with ESLint 9 migration

3. **Alternative Path:**
   - Keep Next.js 15.x for now (stable, working)
   - Upgrade ESLint 9 separately if needed
   - Revisit Next.js 16 in Q2 2025

## Testing Checklist

Before considering upgrades complete:
- [x] `pnpm typecheck` passes
- [x] `pnpm test` passes all tests
- [x] `pnpm build` succeeds for all packages
- [ ] `pnpm --filter docs dev` runs without errors
- [ ] `pnpm lint` passes (will have warnings until ESLint 9)
- [ ] Manual smoke test of docs site

## Notes

- All changes are on the `chore/upgrade-dependencies` branch
- Three commits completed: redundancy cleanup, Phase 2, Phase 3a, Phase 3b
- Turborepo cache has been used effectively throughout
- No breaking changes to component APIs
- All existing tests continue to pass