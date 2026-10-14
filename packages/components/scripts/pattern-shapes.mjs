#!/usr/bin/env node

// Rebuilds the Pattern component's shapes.json from the pattern symbols
// exported from the Figma Foundations library into Pattern/svgs/. Run it
// after re-exporting a crop: pnpm build:pattern. A fresh export names its
// clip path after a Figma node, so rename it to clip0 before committing.
import { readFileSync, writeFileSync } from 'node:fs'

const LINE = '#c2dffb'
const CROPS = ['top', 'left', 'right', 'banner']
const PATTERN_DIR = new URL('../src/components/Pattern/', import.meta.url)

/**
 * Reduces an exported pattern symbol to its swirl paths and the frame they
 * were cropped to. The ground and line colours come from tokens at render
 * time, so only geometry survives.
 *
 * @param {string} svg
 * @returns {{ viewBox: string, paths: string[] }}
 */
export function extractPattern(svg) {
  const viewBox = /<svg\b[^>]*\sviewBox="([^"]*)"/.exec(svg)?.[1]
  if (!viewBox) throw new Error('The export has no viewBox')
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
  return { viewBox, paths }
}

if (import.meta.main) {
  const shapes = Object.fromEntries(
    CROPS.map((crop) => [
      crop,
      extractPattern(
        readFileSync(new URL(`svgs/${crop}.svg`, PATTERN_DIR), 'utf8')
      )
    ])
  )
  writeFileSync(
    new URL('shapes.json', PATTERN_DIR),
    `${JSON.stringify(shapes, null, 2)}\n`
  )
  for (const crop of CROPS)
    console.log(`${crop}: ${shapes[crop].paths.length} paths`)
}
