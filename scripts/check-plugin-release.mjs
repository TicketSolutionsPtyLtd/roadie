#!/usr/bin/env node
// Fails when skills/ changes without a roadie-skills changeset, or when the
// plugin manifest's version drifts from the package's.
// Usage: node scripts/check-plugin-release.mjs [--base origin/main]
import { existsSync, readFileSync } from 'node:fs'

import {
  MANIFEST,
  PACKAGE,
  checkPluginRelease,
  readChangedFiles,
  readVersionAt
} from '../packages/core/scripts/plugin-release.mjs'

const baseIndex = process.argv.indexOf('--base')
const base = (baseIndex !== -1 && process.argv[baseIndex + 1]) || 'origin/main'
const versionOf = (path) => JSON.parse(readFileSync(path, 'utf8')).version

const { ok, message } = checkPluginRelease({
  changedFiles: readChangedFiles(base),
  // Version Packages deletes the changesets it applies.
  readChangeset: (path) => (existsSync(path) ? readFileSync(path, 'utf8') : ''),
  basePackageVersion: readVersionAt(base, PACKAGE),
  packageVersion: versionOf(PACKAGE),
  manifestVersion: versionOf(MANIFEST)
})

if (ok) {
  console.log(message)
} else {
  console.error(message)
  process.exitCode = 1
}
