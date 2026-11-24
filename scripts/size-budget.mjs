#!/usr/bin/env node
// Checks every JS subpath a package exports against its size-budget.json, or
// rewrites that file. Run it from the package, after a build.
// Usage: node ../../scripts/size-budget.mjs [--check | --update]
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  BUDGET_FILE,
  checkBudget,
  jsSubpaths,
  measure,
  serialise
} from './lib/size-budget.mjs'

const { name, exports } = JSON.parse(readFileSync('package.json', 'utf8'))
const started = performance.now()
const measured = {}
for (const { subpath, file } of jsSubpaths(exports)) {
  if (!existsSync(file))
    throw new Error(`${name}: ${file} is missing. Build the package first.`)
  measured[subpath] = await measure(resolve(file))
}
const took = `${((performance.now() - started) / 1000).toFixed(1)}s`

if (process.argv.includes('--update')) {
  writeFileSync(BUDGET_FILE, serialise(measured))
  console.log(
    `${name}: wrote ${Object.keys(measured).length} subpaths to ${BUDGET_FILE} in ${took}.`
  )
} else {
  const budget = existsSync(BUDGET_FILE)
    ? JSON.parse(readFileSync(BUDGET_FILE, 'utf8'))
    : {}
  const { ok, message } = checkBudget(name, budget, measured)
  console[ok ? 'log' : 'error'](`${message}\n\nMeasured in ${took}.`)
  if (!ok) process.exitCode = 1
}
