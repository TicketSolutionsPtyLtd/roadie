#!/usr/bin/env node
// Checks every JS subpath a package exports, and every named import row, against
// its size-budget.json, or rewrites that file. Run it from the package, after a
// build. To guard a named import, add a row such as "./spot { Heart }": {} and
// run --update.
// Usage: node ../../scripts/size-budget.mjs [--check | --update]
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { readExports } from '../packages/core/scripts/package-exports.mjs'
import {
  BUDGET_FILE,
  checkBudget,
  jsSubpaths,
  measure,
  namedRows,
  serialise
} from './lib/size-budget.mjs'

const { name } = JSON.parse(readFileSync('package.json', 'utf8'))
const budget = existsSync(BUDGET_FILE)
  ? JSON.parse(readFileSync(BUDGET_FILE, 'utf8'))
  : {}
const subpaths = jsSubpaths(readExports('.'))
// Before measuring, so a bad row fails in a second, not after the whole run.
const rows = namedRows(
  budget,
  subpaths.map(({ subpath }) => subpath)
)
const started = performance.now()
const measured = {}
const files = {}
for (const { subpath, file } of subpaths) {
  if (!existsSync(file))
    throw new Error(`${name}: ${file} is missing. Build the package first.`)
  files[subpath] = resolve(file)
  measured[subpath] = await measure(files[subpath])
}
for (const { row, subpath, names } of rows)
  measured[row] = await measure(files[subpath], names)
const took = `${((performance.now() - started) / 1000).toFixed(1)}s`

if (process.argv.includes('--update')) {
  writeFileSync(BUDGET_FILE, serialise(measured))
  console.log(
    `${name}: wrote ${Object.keys(measured).length} subpaths to ${BUDGET_FILE} in ${took}.`
  )
} else {
  const { ok, message } = checkBudget(name, budget, measured)
  console[ok ? 'log' : 'error'](`${message}\n\nMeasured in ${took}.`)
  if (!ok) process.exitCode = 1
}
