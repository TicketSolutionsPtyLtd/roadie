// Cross-bundler dev-mode check. `process.env.NODE_ENV` is replaced at
// build time by every mainstream bundler (Next.js, Vite, Webpack,
// Rollup); the `typeof process` guard covers runtimes that haven't
// shimmed `process` on the client. See:
//   docs/solutions/build-errors/cross-bundler-dev-env-check.md
//
// Do NOT replace with `import.meta.env.DEV`: that's Vite-only and will
// silently never fire in Next.js or Webpack consumers, including the
// Roadie docs site itself.
//
// The build writes each imported `isDev()` call as the check itself
// (scripts/dev-only.mjs), since no bundler inlines the function, so an
// app's production bundle drops the branch. Import it rather than copy it.

declare const process: { env?: { NODE_ENV?: string } } | undefined

export function isDev(): boolean {
  return (
    typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production'
  )
}
