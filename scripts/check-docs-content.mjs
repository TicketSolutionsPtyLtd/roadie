#!/usr/bin/env node
// Fails on an em dash in docs, changesets, PR-facing markdown, or a package
// source comment (prop JSDoc reaches the docs' props tables), and on a docs
// example image served from a third-party host.
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
import {
  SOURCE_COMMENT_FILES,
  commentEmDashFindings
} from './lib/source-comments.mjs'

const read = (file) => readFileSync(join(repoRoot, file), 'utf8')

const findings = [
  ...trackedFiles(EM_DASH_FILES).flatMap((file) =>
    emDashFindings(file, read(file))
  ),
  ...trackedFiles(SOURCE_COMMENT_FILES).flatMap((file) =>
    commentEmDashFindings(file, read(file))
  ),
  ...trackedFiles(IMAGE_FILES).flatMap((file) =>
    externalImageFindings(file, read(file))
  )
]

for (const { file, line, message } of findings)
  console.error(`${file}:${line}: ${message}`)

if (findings.length > 0) process.exitCode = 1
else console.log('Docs content OK.')
