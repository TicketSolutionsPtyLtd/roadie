import { execFileSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

import { type Drawing, draw } from './draw/index.ts'
import { SVGS } from './generate.ts'
import { measure } from './measure.ts'
import { normalise, toSvg } from './normalise.ts'
import { preview } from './preview.ts'

const USAGE = `Usage: pnpm spot:draw <name>... [--preview <file.png>]

Draws drawings/<name>.ts: extrudes its front, fits it to the box, and writes
src/spot/svgs/<name>.svg through the converter. Then it regenerates the
components and says how the drawing measures against the set.

--preview  also save a preview sheet beside some of the set`

export const DRAWINGS = join(import.meta.dirname, '../../drawings')

const pct = (n = 0) => `${Math.round(n * 100)}%`

/** Draws a drawing file into its source, returning the source's layers. */
export async function drawSource(slug: string) {
  const file = join(DRAWINGS, `${slug}.ts`)
  if (!existsSync(file))
    throw new Error(
      `there's no drawings/${slug}.ts; start one with spot:new ${slug}`
    )
  const drawing = (await import(pathToFileURL(file).href)).default as Drawing
  const { layers } = normalise(draw(drawing).svg)
  writeFileSync(join(SVGS, `${slug}.svg`), toSvg(layers))
  return layers
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { preview: { type: 'string' }, help: { type: 'boolean' } }
  })
  if (values.help || positionals.length === 0) {
    console.log(USAGE)
    process.exit(values.help ? 0 : 2)
  }
  const drawn: string[] = []
  for (const slug of positionals) {
    try {
      const layers = await drawSource(slug)
      const m = measure(layers)
      console.log(
        `${slug}.svg: covers ${pct(m.coverage)} of the box, ${m.longSide.toFixed(1)} by ${m.shortSide.toFixed(1)}; ` +
          Object.entries(m.shares)
            .map(([layer, share]) => `${layer} ${pct(share)}`)
            .join(', ')
      )
      drawn.push(slug)
    } catch (error) {
      console.error(`${slug}: ${(error as Error).message}`)
      process.exitCode = 1
    }
  }
  if (drawn.length) {
    execFileSync('node', [join(import.meta.dirname, 'generate.ts')], {
      stdio: 'inherit'
    })
    const calledFrom = process.env.INIT_CWD ?? process.cwd()
    if (values.preview) {
      const out = resolve(calledFrom, values.preview)
      await preview(drawn, { out })
      console.log(`Preview: ${out}`)
    } else
      console.log(`See it beside the set: pnpm spot:preview ${drawn.join(' ')}`)
  }
}
