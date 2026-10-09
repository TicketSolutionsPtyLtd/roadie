#!/usr/bin/env node
// Fails when skills/ changes without a plugin version bump and changelog entry.
// Usage: node scripts/check-plugin-release.mjs [--base origin/main]
import { readFileSync } from 'node:fs'

import {
  CHANGELOG,
  checkPluginRelease,
  readChangedFiles,
  readVersion
} from '../packages/core/scripts/plugin-release.mjs'

const baseIndex = process.argv.indexOf('--base')
const base = (baseIndex !== -1 && process.argv[baseIndex + 1]) || 'origin/main'

const { ok, message } = checkPluginRelease({
  changedFiles: readChangedFiles(base),
  baseVersion: readVersion(base),
  headVersion: readVersion('HEAD'),
  changelog: readFileSync(CHANGELOG, 'utf8')
})

if (ok) {
  console.log(message)
} else {
  console.error(message)
  process.exitCode = 1
}
