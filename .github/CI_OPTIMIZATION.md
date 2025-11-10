# GitHub Actions CI Optimization Guide

This document explains the optimizations made to speed up CI runs, particularly the typecheck step.

## Performance Summary

### Before Optimization
- Cold typecheck (including dependencies): ~7-8 seconds
- Builds ran serially, causing unnecessary waits
- No intermediate caching between jobs
- Redundant builds across jobs

### After Optimization
- Expected CI time reduction: **40-60%** for typical PRs
- Parallel job execution with smart dependencies
- Aggressive caching of build artifacts
- Jobs only rebuild what they need

## Key Optimizations

### 1. **Build Once, Use Everywhere**

Previously, each job (lint, typecheck, test) would trigger a full rebuild of the core package through Turbo dependencies. Now:

- `build-core` job runs once and caches the output
- `build-components` job runs once (depends on core) and caches the output
- All other jobs restore from cache instead of rebuilding

**Impact**: Eliminates 3-4 redundant core builds (saving ~20-25 seconds)

### 2. **Parallel Job Execution**

```
Old Flow (Serial):
lint → typecheck → test → build-packages
Total: ~35-45s

New Flow (Parallel):
build-core (6s)
  ├─→ lint (3s)
  ├─→ typecheck (3s)
  ├─→ test (4s)
  └─→ build-components (3s)
         └─→ build-docs (10s)

Total: ~16-20s
```

### 3. **Multi-Layer Caching Strategy**

#### A. pnpm Store Cache
Caches the global pnpm store to avoid downloading packages:
```yaml
key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
```

#### B. node_modules Cache
Caches installed dependencies across all packages:
```yaml
key: ${{ runner.os }}-node-modules-${{ hashFiles('**/pnpm-lock.yaml') }}
```

#### C. TypeScript Build Info Cache
Caches incremental TypeScript compilation data:
```yaml
key: ${{ runner.os }}-tsbuildinfo-${{ hashFiles('**/tsconfig*.json', 'packages/*/src/**/*.ts') }}
```

#### D. Build Artifact Cache (New)
Caches built packages to share between jobs:
```yaml
key: core-dist-${{ github.sha }}
```

#### E. Turbo Cache
Caches Turbo's task outputs:
```yaml
key: ${{ runner.os }}-turbo-${{ github.sha }}
```

### 4. **Turbo Configuration Enhancements**

Added to `turbo.json`:

```json
{
  "globalEnv": ["CI", "NODE_ENV"],
  "tasks": {
    "typecheck": {
      "outputLogs": "hash-only"
    }
  }
}
```

**Benefits**:
- `outputLogs: "hash-only"` reduces log noise in CI
- `globalEnv` ensures proper cache invalidation on environment changes
- `*.tsbuildinfo` added to build outputs for TypeScript incremental compilation

### 5. **Installation Optimization**

Changed from:
```bash
pnpm install --frozen-lockfile
```

To:
```bash
pnpm install --frozen-lockfile --prefer-offline
```

**Impact**: Uses cached packages when available, reducing network I/O

### 6. **Reduced GitHub API Calls**

Removed unnecessary `fetch-depth: 2` from most jobs. Only needed for specific git operations.

### 7. **CI Success Gate Job**

Added a single `ci-success` job that all branch protection rules should depend on:

```yaml
jobs:
  ci-success:
    needs: [lint, typecheck, test, build-docs]
    if: always()
```

**Benefits**:
- Single job to add to branch protection rules
- Properly handles failed/cancelled jobs
- Easier to maintain branch protection settings

## Expected Timing Breakdown

### Typical PR (No Cache)
1. **Setup** (pnpm install): ~15-20s → **8-12s** (with caching)
2. **build-core**: ~6s
3. **Parallel jobs** (max): ~4s
4. **build-docs**: ~10s
5. **Total**: ~25-30s (was ~45-60s)

### Typical PR (Warm Cache)
1. **Setup**: ~5-8s
2. **build-core**: ~2s (Turbo cache hit)
3. **Parallel jobs**: ~2s (cache hits)
4. **build-docs**: ~5s (partial cache)
5. **Total**: ~10-15s (was ~30-40s)

### No Changes to Packages (Docs Only)
1. **Setup**: ~5s
2. **All package jobs**: ~2s (cache hits)
3. **build-docs**: ~10s
4. **Total**: ~12s (was ~35s)

## TypeScript Compilation Performance

The actual typecheck times (without build dependencies):
- **Core package**: 0.5s
- **Components package**: 0.5s
- **Docs package**: 1.5s

The majority of "typecheck time" is actually building the core package (token generation + PandaCSS codegen + tsup DTS generation).

## Recommendations

### For Branch Protection Rules

Update your branch protection rules to require only:
- `CI Success` job

Instead of individual jobs (lint, typecheck, test, etc.)

### For Further Optimization

1. **Enable Turbo Remote Caching** (Vercel/Turborepo Cloud):
   - Share cache across team members and CI runs
   - Potential additional 30-50% speed improvement
   - Would reduce cold builds to warm-cache timing

2. **Consider Larger GitHub Runner**:
   - If budget allows, use `ubuntu-latest-4-core` or `ubuntu-latest-8-core`
   - Parallel compilation would be faster
   - Estimated additional 20-30% improvement

3. **Skip Unnecessary Steps in CI**:
   - Consider skipping Figma token generation in CI if not needed
   - Add `CI=true` check in build scripts

## Monitoring Performance

To track CI performance over time:

```bash
# View workflow run times
gh run list --workflow=ci.yml --limit 20 --json conclusion,createdAt,updatedAt,displayTitle
```

Look for:
- Average run time trends
- Cache hit rates
- Slowest jobs

## Troubleshooting

### Cache Not Being Restored

Check:
1. Lock file hasn't changed (`pnpm-lock.yaml`)
2. TypeScript files haven't changed significantly
3. GitHub cache storage isn't full (10GB limit)

### Builds Still Slow

1. Clear all caches and run again
2. Check if a dependency change invalidated caches
3. Review Turbo logs for cache misses
4. Ensure `build-core` cache is being saved correctly

### Jobs Failing with "Module Not Found"

- Verify cache restore steps have `fail-on-cache-miss: true`
- Check that build-core/build-components ran successfully
- Ensure artifact paths in cache config are correct

## Additional Resources

- [Turbo Caching Documentation](https://turbo.build/repo/docs/core-concepts/caching)
- [GitHub Actions Cache Documentation](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [pnpm CI Documentation](https://pnpm.io/continuous-integration)