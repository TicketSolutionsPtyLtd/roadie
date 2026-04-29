// Cross-bundler dev-mode check. `process.env.NODE_ENV` is replaced at
// build time by every mainstream bundler (Next.js, Vite, Webpack,
// Rollup); the `typeof process` guard covers runtimes that haven't
// shimmed `process` on the client. See:
//   docs/solutions/build-errors/cross-bundler-dev-env-check.md
//
// Do NOT replace with `import.meta.env.DEV` — that's Vite-only and will
// silently never fire in Next.js or Webpack consumers, including the
// Roadie docs site itself.

declare const process: { env?: { NODE_ENV?: string } } | undefined

export function isDev(): boolean {
  return (
    typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production'
  )
}
