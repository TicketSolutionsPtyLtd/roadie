import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { readExports } from '../package-exports.mjs'
import { DOCUMENTED_ELSEWHERE } from './elsewhere'
import { importPath } from './manifest'

const packagesDir = new URL('../../../', import.meta.url)

// Each package's build checks only its own keys, so a key naming no package
// would never be checked.
const importPaths = readdirSync(packagesDir).flatMap((dir) => {
  const packageDir = fileURLToPath(new URL(dir, packagesDir))
  const { name } = JSON.parse(
    readFileSync(`${packageDir}/package.json`, 'utf8')
  ) as { name: string }
  return readExports(packageDir).map(({ subpath }) => importPath(name, subpath))
})

describe('DOCUMENTED_ELSEWHERE', () => {
  it.each(Object.keys(DOCUMENTED_ELSEWHERE))(
    '%s is a package import path',
    (key) => {
      expect(importPaths).toContain(key)
    }
  )
})
