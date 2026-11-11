import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { parseArgs } from 'node:util'

import { compare } from './compare.ts'
import { SVGS } from './generate.ts'
import { normalise, toSvg } from './normalise.ts'

const USAGE = `Usage: pnpm spot:convert <file.svg>... [--name <slug>] [--no-compare]

Turns SVGs drawn in the spot illustration colours (a Figma export, say) into
sources in src/spot/svgs/: one path per layer, the art fitted inside the box,
then regenerates the components. It renders each before and after and counts
the pixels that changed, so you can see nothing moved.

--name       the file name, for a single SVG (defaults to its own, in kebab-case)
--no-compare skip the before and after render`

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    name: { type: 'string' },
    'no-compare': { type: 'boolean' },
    help: { type: 'boolean' }
  }
})

if (
  values.help ||
  positionals.length === 0 ||
  (values.name && positionals.length > 1)
) {
  console.log(USAGE)
  process.exit(values.help ? 0 : 2)
}

const slugOf = (file: string) =>
  basename(file, '.svg')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

const pairs = []
for (const file of positionals) {
  const slug = values.name ?? slugOf(file)
  const before = readFileSync(file, 'utf8')
  try {
    const report = normalise(before)
    const after = toSvg(report.layers)
    writeFileSync(join(SVGS, `${slug}.svg`), after)
    const notes = [
      report.clippedStrokes &&
        `cut back ${report.clippedStrokes} hidden stroke(s)`,
      report.fit &&
        `shrunk to ${(report.fit.scale * 100).toFixed(1)}% to fit the outline`,
      report.strokeWidths.some((w) => w !== 0.5) &&
        `stroke widths ${report.strokeWidths.join(', ')} set to 0.5`
    ].filter(Boolean)
    console.log(
      `${slug}.svg: ${report.layers.map((l) => l.name).join(', ')}${notes.length ? ` (${notes.join('; ')})` : ''}`
    )
    pairs.push({ name: slug, before, after })
  } catch (error) {
    console.error(`${file}: ${(error as Error).message}`)
    process.exitCode = 1
  }
}

if (pairs.length && !values['no-compare']) {
  const sheet = join(tmpdir(), `spot-compare-${Date.now()}.png`)
  for (const { name, changedPixels } of await compare(pairs, sheet))
    console.log(`${name}: ${changedPixels} pixels changed at 8×`)
  console.log(`Before, after, and the changes in red: ${sheet}`)
}

if (pairs.length)
  execFileSync('node', [join(import.meta.dirname, 'generate.ts')], {
    stdio: 'inherit'
  })
