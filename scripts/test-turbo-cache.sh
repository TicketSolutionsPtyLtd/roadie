#!/bin/bash

echo "🧪 Testing Turborepo cache configuration..."

# Clean everything first
echo "\n1. Cleaning all caches and builds..."
pnpm clean
pnpm turbo clean
rm -rf .turbo

# Install dependencies
echo "\n2. Installing dependencies..."
pnpm install

# First build to establish baseline
echo "\n3. Running initial build..."
time pnpm turbo build
echo "✓ Initial build complete"

# Test cache hit
echo "\n4. Testing cache hit (should be instant)..."
time pnpm turbo build
echo "✓ Cache hit test complete"

# Test single file change
echo "\n5. Testing single file change..."
touch packages/components/src/test-file.ts
time pnpm turbo build
echo "✓ Single file change test complete"

# Test dependency change
echo "\n6. Testing package.json change..."
sed -i.bak "s/\"version\": \".*\"/\"version\": \"0.0.0-test\"/" packages/core/package.json
time pnpm turbo build
echo "✓ Dependency change test complete"

# Test config change
echo "\n7. Testing tsconfig change..."
touch packages/components/tsconfig.json
time pnpm turbo build
echo "✓ Config change test complete"

# Test format task
echo "\n8. Testing format task..."
time pnpm turbo format
time pnpm turbo format
echo "✓ Format task test complete"

# Test typecheck task
echo "\n9. Testing typecheck task..."
time pnpm turbo typecheck
time pnpm turbo typecheck
echo "✓ Typecheck task test complete"

# Cleanup test artifacts
echo "\n10. Cleaning up test artifacts..."
git checkout packages/core/package.json
rm -f packages/components/src/test-file.ts
rm -f packages/core/package.json.bak

echo "\n✨ All tests complete!"
