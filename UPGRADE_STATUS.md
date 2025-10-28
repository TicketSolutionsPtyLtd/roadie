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

1. **Node.js Version:** Requires Node.js >= 18.18.0 (currently met)

2. **Configuration Migration:**
   - Migrate `.eslintrc.cjs` (root) to `eslint.config.js` (flat config format)
   - Migrate `docs/.eslintrc.json` to flat config format
   - Convert `extends` arrays to flat config imports
   - Convert `plugins` to flat config plugin objects
   - Convert `parserOptions` to `languageOptions`
   - Convert `env` settings to appropriate `languageOptions.globals`

3. **Config Format Changes:**
   ```js
   // Old (.eslintrc.cjs)
   module.exports = {
     parser: '@typescript-eslint/parser',
     plugins: ['@typescript-eslint', 'prettier'],
     extends: ['eslint:recommended'],
     parserOptions: { ecmaVersion: 2022 }
   }

   // New (eslint.config.js)
   import js from '@eslint/js';
   import typescript from '@typescript-eslint/eslint-plugin';
   import parser from '@typescript-eslint/parser';

   export default [
     js.configs.recommended,
     {
       files: ['**/*.ts', '**/*.tsx'],
       plugins: { '@typescript-eslint': typescript },
       languageOptions: {
         parser: parser,
         ecmaVersion: 2022,
         sourceType: 'module'
       }
     }
   ];
   ```

4. **Plugin Updates:**
   - Install `@eslint/js` package (provides `eslint:recommended` config)
   - Verify all plugins support ESLint 9 flat config:
     - `@typescript-eslint/eslint-plugin@8.46.2` ✅ (already compatible)
     - `@typescript-eslint/parser@8.46.2` ✅ (already compatible)
     - `eslint-plugin-prettier@5.5.4` ✅ (check compatibility)
     - `eslint-plugin-react@7.37.5` ✅ (check compatibility)
     - `@pandacss/eslint-plugin@0.2.14` ⚠️ (verify flat config support)
     - `eslint-plugin-mdx@3.6.2` ⚠️ (verify flat config support)
     - `eslint-config-next@16.0.0` (requires ESLint 9+)

5. **Breaking Changes to Address:**
   - `eslint:recommended` has 4 new rules enabled
   - `no-unused-vars` now defaults `caughtErrors` to `"all"`
   - `no-inner-declarations` has new default behavior
   - Rules removed from `eslint:recommended`: `no-extra-semi`, `no-mixed-spaces-and-tabs`, `no-new-symbol`
   - `--quiet` flag behavior changed (won't run rules set to "warn")

6. **Testing Requirements:**
   - Run `pnpm lint` and verify all files pass
   - Test with `--quiet` flag if used in CI
   - Verify editor integrations still work
   - Test all custom rule configurations
   - Ensure pre-commit hooks still function

**Dependencies:**
- Blocked by Next.js 16 upgrade (needs `eslint-config-next@16.0.0`)
- Can be done independently if staying on Next.js 15.x

**Recommendation:**
- Perform as a separate PR with thorough testing
- Use ESLint's official migration guide: https://eslint.org/docs/latest/use/migrate-to-9.0.0
- Consider using automated migration tools if available
- Budget 4-6 hours for migration and testing
- Can be done before Next.js 16 if desired (just skip `eslint-config-next` upgrade)

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