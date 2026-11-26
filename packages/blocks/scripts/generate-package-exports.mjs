#!/usr/bin/env node
// Writes package.json `exports` from src; run after adding or removing a
// top-level block. There's no root barrel: apps import one block per subpath.
import { generateExports } from '../../core/scripts/generate-exports.mjs'

generateExports(new URL('..', import.meta.url), {
  source: 'src',
  before: {
    './css': { style: './src/css/blocks.css', default: './src/css/blocks.css' }
  },
  after: {
    // The editor's adapter, apart from the catalogue, which stays React-free.
    './catalogue/sections': {
      types: './dist/catalogue/sections.d.ts',
      import: './dist/catalogue/sections.js'
    },
    './thumbnails/*': './src/thumbnails/*',
    './roadie.manifest.json': './dist/roadie.manifest.json'
  }
})
