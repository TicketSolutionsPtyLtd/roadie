#!/usr/bin/env node
// Copies the roadie-skills version into the plugin manifest. Runs after
// `changeset version` (the changeset:version script), so the two can't drift.
import { readFileSync, writeFileSync } from 'node:fs'

import {
  MANIFEST,
  PACKAGE,
  syncManifest
} from '../packages/core/scripts/plugin-release.mjs'

const { version } = JSON.parse(readFileSync(PACKAGE, 'utf8'))
writeFileSync(MANIFEST, syncManifest(readFileSync(MANIFEST, 'utf8'), version))
console.log(`${MANIFEST} is now ${version}.`)
