#!/usr/bin/env node
// Warns when a branch changes more lines than one review sitting can cover.
// Usage: node scripts/check-pr-size.mjs [--base origin/main] [--strict]
import {
  countChangedLines,
  formatReport,
  parseArgs,
  readNumstat
} from '../packages/core/scripts/pr-size.mjs'

const { base, strict } = parseArgs(process.argv.slice(2))
const numstat = readNumstat(base)

if (numstat !== null) {
  const { oversized, message } = formatReport(countChangedLines(numstat), base)
  if (oversized) {
    console.warn(message)
    if (strict) process.exitCode = 1
  } else {
    console.log(message)
  }
}
