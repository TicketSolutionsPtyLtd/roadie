import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The shared React skin must stay framework-router-agnostic: routing flows
// through the required `onNavigate` callback, never `next/link` or any other
// `next/*` import (design dynamic-links audit). A stray import would break in
// any non-Next React app and is meaningless in Vue.

const REACT_SRC = __dirname

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...sourceFiles(full))
      continue
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue
    if (/\.test\.(ts|tsx)$/.test(entry.name)) continue
    out.push(full)
  }
  return out
}

// Matches `from 'next/…'`, `from "next"`, and `import('next/…')`.
const NEXT_IMPORT = /(from\s+['"]next(?:\/[^'"]*)?['"])|(import\(\s*['"]next)/

describe('no next/* import in the React skin', () => {
  it('source files never import from next', () => {
    const offenders: string[] = []
    for (const file of sourceFiles(REACT_SRC)) {
      const text = readFileSync(file, 'utf8')
      if (NEXT_IMPORT.test(text)) offenders.push(file)
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})
