// `import.meta.env.DEV` is Vite-only; see
// docs/solutions/build-errors/cross-bundler-dev-env-check.md.
declare const process: { env?: { NODE_ENV?: string } } | undefined

export function isDev(): boolean {
  return (
    typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production'
  )
}
