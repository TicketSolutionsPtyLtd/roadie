#!/usr/bin/env node
// Writes package.json `exports` from src; run after adding or removing a
// top-level map piece.
import { generateExports } from '../../core/scripts/generate-exports.mjs'

generateExports(new URL('..', import.meta.url), {
  source: 'src',
  before: {
    '.': { types: './dist/index.d.ts', import: './dist/index.js' },
    './css': { style: './src/css/maps.css', default: './src/css/maps.css' }
  },
  after: { './roadie.manifest.json': './dist/roadie.manifest.json' }
})
