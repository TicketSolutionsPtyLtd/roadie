#!/usr/bin/env node
// Writes package.json `exports` from src/components; run after adding or
// removing a component. Indicator is internal (Field, Select and RadioGroup
// use it), and SpotIllustration keeps its older `./spot-illustrations` key.
import { generateExports } from '../../core/scripts/generate-exports.mjs'

generateExports(new URL('..', import.meta.url), {
  source: 'src/components',
  capitalOnly: true,
  exclude: ['Indicator', 'SpotIllustration'],
  before: {
    '.': { types: './dist/index.d.ts', import: './dist/index.js' },
    // Registers the Tailwind source, so apps import the package's CSS rather
    // than a node_modules path. Not JavaScript, so attw leaves it out.
    './css': {
      style: './src/css/components.css',
      default: './src/css/components.css'
    }
  },
  after: {
    './spot-illustrations': {
      types: './dist/components/SpotIllustration/index.d.ts',
      import: './dist/components/SpotIllustration/index.js'
    },
    './roadie.manifest.json': './dist/roadie.manifest.json'
  }
})
