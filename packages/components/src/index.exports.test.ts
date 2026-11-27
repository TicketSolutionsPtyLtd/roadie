import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { readExports } from '../../core/scripts/package-exports.mjs'

// The package's tsconfig has no Node types, so files go through ts.sys.
const PACKAGE_DIR = expect.getState().testPath!.replace(/\/src\/[^/]+$/, '')

// Subpath-only on purpose: the illustrations are an asset set, and _snapshot is
// Countdown's test seam.
const SUBPATH_ONLY: Record<string, string[] | 'all'> = {
  './spot-illustrations': 'all',
  './countdown': ['_snapshot']
}

function subpathEntries() {
  return readExports(PACKAGE_DIR).flatMap(({ subpath, kind, source }) => {
    if (subpath === '.' || kind !== 'js') return []
    if (!source) throw new Error(`No source for ${subpath}`)
    return [{ subpath, source }]
  })
}

function exportNames(files: string[]) {
  const config = ts.getParsedCommandLineOfConfigFile(
    `${PACKAGE_DIR}/tsconfig.json`,
    {},
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} }
  )
  const program = ts.createProgram(files, { ...config?.options, noEmit: true })
  const checker = program.getTypeChecker()
  return (file: string) => {
    const module = checker.getSymbolAtLocation(program.getSourceFile(file)!)!
    return checker.getExportsOfModule(module).map((symbol) => symbol.name)
  }
}

describe('root barrel', () => {
  it('exports everything each component subpath exports', () => {
    const barrel = `${PACKAGE_DIR}/src/index.tsx`
    const entries = subpathEntries()
    const namesOf = exportNames([barrel, ...entries.map((e) => e.source)])
    const inBarrel = new Set(namesOf(barrel))

    const missing = entries.flatMap(({ subpath, source }) => {
      const skip = SUBPATH_ONLY[subpath]
      if (skip === 'all') return []
      return namesOf(source)
        .filter((name) => !inBarrel.has(name) && !skip?.includes(name))
        .map((name) => `${subpath}: ${name}`)
    })

    expect(missing).toEqual([])
  }, 60_000)
})
