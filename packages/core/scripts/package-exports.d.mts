export type ExportTarget = string | { [condition: string]: ExportTarget }

export type ExportEntry = {
  subpath: string
  /** The file an app's bundler resolves: `import`, then `default`, then `style`. */
  target: string
  kind: 'js' | 'css' | 'json' | 'asset'
  /** Every file any condition points at, types included. */
  files: string[]
  /** The TypeScript a built JavaScript target comes from, when it has one. */
  source?: string
}

/** Reads an `exports` block; with `packageDir`, also finds each JavaScript target's source. */
export function exportEntries(
  exports: string | Record<string, ExportTarget | null> | undefined,
  packageDir?: string
): ExportEntry[]

/** Reads the `exports` block of the package.json in `packageDir`. */
export function readExports(packageDir: string): ExportEntry[]

/** False for tests, test helpers, fixtures, and hydration fixtures, in `src` or a build. */
export function isShipped(file: string): boolean

/** Every TypeScript file under `src` that ships, relative to `packageDir`, for a build's entries. */
export function shippedSources(packageDir?: string): string[]
