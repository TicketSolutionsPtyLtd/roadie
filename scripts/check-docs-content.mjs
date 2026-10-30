#!/usr/bin/env node
// Fails on an em dash in docs, changesets, or PR-facing markdown, and on a
// docs example image served from a third-party host.
// Usage: node scripts/check-docs-content.mjs
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  EM_DASH_FILES,
  IMAGE_FILES,
  emDashFindings,
  externalImageFindings,
  trackedFiles
} from './lib/docs-content.mjs'
import { repoRoot } from './lib/machine.mjs'

const read = (file) => readFileSync(join(repoRoot, file), 'utf8')

const findings = [
  ...trackedFiles(EM_DASH_FILES).flatMap((file) =>
    emDashFindings(file, read(file))
  ),
  ...trackedFiles(IMAGE_FILES).flatMap((file) =>
    externalImageFindings(file, read(file))
  )
]

for (const { file, line, message } of findings)
  console.error(`${file}:${line}: ${message}`)

if (findings.length > 0) process.exitCode = 1
else console.log('Docs content OK.')
