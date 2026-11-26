// A JavaScript subpath ships only when the build has a source for it that
// isShipped lets through, and the size check measures only the subpaths its
// table names, so a new one needs both before the build that would catch it.
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, it } from 'node:test'

import {
  isShipped,
  readExports
} from '../packages/core/scripts/package-exports.mjs'

const packages = join(import.meta.dirname, '../packages')

describe('every JavaScript subpath', () => {
  for (const dir of readdirSync(packages)) {
    const budgetFile = join(packages, dir, 'size-budget.json')
    if (!existsSync(budgetFile)) continue
    it(`in ${dir} has a build entry and a size budget`, () => {
      const budget = JSON.parse(readFileSync(budgetFile, 'utf8'))
      const unwired = readExports(join(packages, dir))
        .filter(({ kind, subpath }) => kind === 'js' && !subpath.includes('*'))
        .flatMap(({ subpath, target, source }) => [
          ...(source && isShipped(relative(packages, source))
            ? []
            : [`${subpath}: no build entry for ${target}`]),
          ...(Object.hasOwn(budget, subpath) ? [] : [`${subpath}: no budget`])
        ])
      assert.deepEqual(unwired, [])
    })
  }
})
