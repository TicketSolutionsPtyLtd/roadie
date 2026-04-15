import { defineConfig } from 'tsdown'

// Unbundle mode: every source file under `src/` emits as its own output
// file, preserving the source directory structure 1:1. This is load-bearing
// for RSC safety — see:
//
//   docs/solutions/rsc-patterns/compound-export-namespace.md
//   docs/contributing/COMPOUND_PATTERNS.md
//
// In a nutshell: Next.js server components can only "dot into" a compound
// namespace when each leaf is its own on-disk module (separate client
// reference per sub-component). Bundling everything under a compound folder
// into a single file collapses the server-safe re-export layer into the
// client-only leaves, which forces us to choose between a single
// client-reference proxy (dot access fails) or an un-marked file with
// createContext inside (Next bails at compile time). Unbundle mode emits the
// per-file shape Base UI ships and the RSC canary at
// /debug/rsc-smoke verifies it every docs build.
//
// Rolldown preserves module-level `'use client'` directives on per-file
// outputs natively, so leaves that carry the directive still emit with
// `"use client";` at the top. Verify after build with:
//   head -c 13 dist/components/Fieldset/FieldsetRoot.js   # → "use client";
export default defineConfig(({ watch }) => ({
  entry: ['src/**/*.{ts,tsx}', '!**/*.test.{ts,tsx}'],
  unbundle: true,
  format: ['esm'],
  platform: 'neutral',
  dts: {
    resolve: true,
    compilerOptions: {
      composite: false,
      incremental: false
    }
  },
  sourcemap: true,
  clean: !watch,
  target: 'es2022',
  minify: true,
  shims: true,
  outDir: 'dist',
  outExtensions: () => ({ js: '.js' }),
  deps: {
    neverBundle: [
      'react',
      'react-dom',
      '@oztix/roadie-core',
      '@ark-ui/react',
      '@base-ui/react',
      '@phosphor-icons/react'
    ]
  }
}))
