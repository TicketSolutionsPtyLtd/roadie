#!/usr/bin/env node

// Rebuilds the Pattern component's shapes.json from the pattern symbols
// exported from the Figma Foundations library into Pattern/svgs/. Run it
// after re-exporting a symbol: pnpm build:pattern. A fresh export names its
// clip path after a Figma node, so rename it to clip0 before committing.
import { readFileSync, writeFileSync } from 'node:fs'

const LINE = '#c2dffb'
// The banner holds the whole wide artwork; left and right are its portrait
// arrangements. The slide's top band is a slice of the banner, so it isn't
// needed.
const SOURCES = ['banner', 'left', 'right']
const PATTERN_DIR = new URL('../src/components/Pattern/', import.meta.url)
const SAMPLES = 32
const ARITY = { M: 2, L: 2, C: 6, Z: 0 }

/**
 * Reduces an exported pattern symbol to its swirl paths and the field they
 * span, so the component can cover-scale the whole artwork to any box. The
 * ground and line colours come from tokens at render time, so only geometry
 * survives.
 *
 * @param {string} svg
 * @returns {{ viewBox: string, paths: string[] }}
 */
export function extractPattern(svg) {
  if (/<g\b[^>]*\stransform=/.test(svg))
    throw new Error('A group carries a transform; export the symbol flattened')

  const paths = [...svg.matchAll(/<path\b[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => /\sfill="([^"]*)"/.exec(tag)?.[1]?.toLowerCase() === LINE)
    .map((tag) => {
      if (/\stransform=/.test(tag))
        throw new Error('A swirl path carries a transform')
      return /\sd="([^"]*)"/.exec(tag)[1]
    })
  if (paths.length === 0) throw new Error('The export has no swirl paths')
  return { viewBox: fieldOf(paths), paths }
}

/**
 * The whole-pixel box around the paths' outlines. Curves are sampled rather
 * than bounded by their control points, which overshoot the outline.
 *
 * @param {string[]} paths Absolute `M`, `L`, `C`, and `Z` commands only.
 */
export function fieldOf(paths) {
  const xs = []
  const ys = []
  for (const d of paths) {
    if (/[^MLCZ\d\s.,eE-]/.test(d))
      throw new Error('A swirl path uses a command other than M, L, C, or Z')
    let at = [0, 0]
    for (const [, command, args] of d.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
      const n = args.match(/-?(?:\d*\.)?\d+(?:e-?\d+)?/gi)?.map(Number) ?? []
      // An implicitly repeated command would be bounded by its first segment.
      if (n.length !== ARITY[command])
        throw new Error(
          `A swirl path's ${command} has ${n.length} numbers, not ${ARITY[command]}`
        )
      if (command === 'C') {
        for (let i = 1; i <= SAMPLES; i++) {
          const t = i / SAMPLES
          const [a, b, c, e] = [
            (1 - t) ** 3,
            3 * (1 - t) ** 2 * t,
            3 * (1 - t) * t ** 2,
            t ** 3
          ]
          xs.push(a * at[0] + b * n[0] + c * n[2] + e * n[4])
          ys.push(a * at[1] + b * n[1] + c * n[3] + e * n[5])
        }
        at = [n[4], n[5]]
      } else if (command !== 'Z') {
        at = [n[0], n[1]]
        xs.push(at[0])
        ys.push(at[1])
      }
    }
  }
  const x = Math.floor(Math.min(...xs))
  const y = Math.floor(Math.min(...ys))
  return `${x} ${y} ${Math.ceil(Math.max(...xs)) - x} ${Math.ceil(Math.max(...ys)) - y}`
}

if (import.meta.main) {
  const shapes = Object.fromEntries(
    SOURCES.map((source) => [
      source,
      extractPattern(
        readFileSync(new URL(`svgs/${source}.svg`, PATTERN_DIR), 'utf8')
      )
    ])
  )
  writeFileSync(
    new URL('shapes.json', PATTERN_DIR),
    `${JSON.stringify(shapes, null, 2)}\n`
  )
  for (const source of SOURCES)
    console.log(`${source}: ${shapes[source].viewBox}`)
}
