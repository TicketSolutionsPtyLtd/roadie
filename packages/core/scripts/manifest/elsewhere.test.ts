import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { DOCUMENTED_ELSEWHERE } from './elsewhere'
import { importPath } from './manifest'

const packagesDir = new URL('../../../', import.meta.url)

// Each package's build checks only its own keys, so a key naming no package
// would never be checked.
const importPaths = readdirSync(packagesDir).flatMap((dir) => {
  const { name, exports = {} } = JSON.parse(
    readFileSync(new URL(`${dir}/package.json`, packagesDir), 'utf8')
  ) as { name: string; exports?: Record<string, unknown> }
  return Object.keys(exports).map((subpath) => importPath(name, subpath))
})

describe('DOCUMENTED_ELSEWHERE', () => {
  it.each(Object.keys(DOCUMENTED_ELSEWHERE))(
    '%s is a package import path',
    (key) => {
      expect(importPaths).toContain(key)
    }
  )
})
