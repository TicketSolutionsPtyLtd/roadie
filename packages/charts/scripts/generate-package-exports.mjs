#!/usr/bin/env node
// Writes package.json `exports` from src; run after adding or removing a
// top-level chart piece.
import { generateExports } from '../../core/scripts/generate-exports.mjs'

generateExports(new URL('..', import.meta.url), {
  source: 'src',
  before: {
    '.': { types: './dist/index.d.ts', import: './dist/index.js' },
    './css': { style: './src/css/charts.css', default: './src/css/charts.css' }
  },
  after: { './roadie.manifest.json': './dist/roadie.manifest.json' }
})
