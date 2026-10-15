#!/usr/bin/env node

// Rebuilds the Pattern component's shapes.json from the pattern symbols
// exported from the Figma Foundations library into Pattern/svgs/. Run it
// after re-exporting a symbol: pnpm build:pattern. A fresh export names its
// clip path after a Figma node, so rename it to clip0 before committing.
import { readFileSync, writeFileSync } from 'node:fs'

const LINE = '#c2dffb'
// The banner holds the whole artwork. The slides' top band is a slice of it,
// and their left and right panels are it turned on its side, so the component
// transforms this one source per crop.
const SOURCE = 'svgs/banner.svg'
const PATTERN_DIR = new URL('../src/components/Pattern/', import.meta.url)
const SAMPLES = 32
const ARITY = { M: 2, L: 2, C: 6, Z: 0 }

/**
 * Reduces an exported pattern symbol to its swirl paths, the field they span,
 * and the safe area inside it that the component shows. The ground and line
 * colours come from tokens at render time, so only geometry survives.
 *
 * @param {string} svg
 * @returns {{ viewBox: string, safe: string, paths: string[] }}
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
  return { viewBox: fieldOf(paths), safe: safeAreaOf(paths), paths }
}

/**
 * The whole-pixel box around the paths' outlines. Curves are sampled rather
 * than bounded by their control points, which overshoot the outline.
 *
 * @param {string[]} paths Absolute `M`, `L`, `C`, and `Z` commands only.
 */
export function fieldOf(paths) {
  const points = outlinesOf(paths).flat(2)
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const x = Math.floor(Math.min(...xs))
  const y = Math.floor(Math.min(...ys))
  return `${x} ${y} ${Math.ceil(Math.max(...xs)) - x} ${Math.ceil(Math.max(...ys)) - y}`
}

/**
 * Each path as its subpaths, each a closed polygon, with curves sampled.
 *
 * @param {string[]} paths Absolute `M`, `L`, `C`, and `Z` commands only.
 * @returns {[number, number][][][]}
 */
function outlinesOf(paths) {
  return paths.map((d) => {
    if (/[^MLCZ\d\s.,eE-]/.test(d))
      throw new Error('A swirl path uses a command other than M, L, C, or Z')
    const subpaths = []
    let at = [0, 0]
    for (const [, command, args] of d.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
      const n = args.match(/-?(?:\d*\.)?\d+(?:e-?\d+)?/gi)?.map(Number) ?? []
      // An implicitly repeated command would be traced by its first segment.
      if (n.length !== ARITY[command])
        throw new Error(
          `A swirl path's ${command} has ${n.length} numbers, not ${ARITY[command]}`
        )
      if (command === 'M') subpaths.push([])
      const outline = subpaths.at(-1)
      if (command === 'C') {
        for (let i = 1; i <= SAMPLES; i++) {
          const t = i / SAMPLES
          const [a, b, c, e] = [
            (1 - t) ** 3,
            3 * (1 - t) ** 2 * t,
            3 * (1 - t) * t ** 2,
            t ** 3
          ]
          outline.push([
            a * at[0] + b * n[0] + c * n[2] + e * n[4],
            a * at[1] + b * n[1] + c * n[3] + e * n[5]
          ])
        }
        at = [n[4], n[5]]
      } else if (command !== 'Z') {
        at = [n[0], n[1]]
        outline.push(at)
      }
    }
    return subpaths
  })
}

/**
 * The largest rectangle the swirls fill out to every side, so a box covered
 * by it never shows the artwork's outer edge or a ring's end. The swirls are
 * rasterised, the ground between rings is closed over, and what the closed
 * shape holds is the area the pattern can show.
 *
 * @param {string[]} paths
 * @param {{ cell?: number, gap?: number }} [options] The grid cell, and the
 *   ground gap to close, in artwork units. Ground the swirls enclose is kept
 *   whatever its size; ground open to the outside is closed over up to about
 *   `gap`, rounded up to whole cells on each side.
 */
export function safeAreaOf(paths, { cell = 8, gap = 100 } = {}) {
  const [x0, y0, width, height] = fieldOf(paths).split(' ').map(Number)
  const r = Math.ceil(gap / 2 / cell)
  // A margin of r cells lets the closing reach past the artwork's edge.
  const cols = Math.ceil(width / cell) + 2 * r + 2
  const rows = Math.ceil(height / cell) + 2 * r + 2
  const ox = x0 - (r + 1) * cell
  const oy = y0 - (r + 1) * cell
  const swirl = new Uint8Array(cols * rows)
  const edges = outlinesOf(paths).map((subpaths) =>
    subpaths.flatMap((poly) =>
      poly.map((p, i) => [p, poly[(i + 1) % poly.length]])
    )
  )
  for (let row = 0; row < rows; row++) {
    const y = oy + (row + 0.5) * cell
    for (const pathEdges of edges) {
      const crossings = []
      for (const [[ax, ay], [bx, by]] of pathEdges)
        if (ay <= y !== by <= y)
          crossings.push([
            ax + ((y - ay) / (by - ay)) * (bx - ax),
            by > ay ? 1 : -1
          ])
      crossings.sort((a, b) => a[0] - b[0])
      let winding = 0
      for (let i = 0; i < crossings.length - 1; i++) {
        winding += crossings[i][1]
        if (winding === 0) continue
        const from = Math.ceil((crossings[i][0] - ox) / cell - 0.5)
        const to = Math.floor((crossings[i + 1][0] - ox) / cell - 0.5)
        for (let col = Math.max(0, from); col <= Math.min(cols - 1, to); col++)
          swirl[row * cols + col] = 1
      }
    }
  }
  const disk = []
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (dx * dx + dy * dy <= r * r) disk.push([dx, dy])
  const at = (grid, col, row) =>
    col >= 0 && row >= 0 && col < cols && row < rows
      ? grid[row * cols + col]
      : 0
  const morph = (grid, keep) => {
    const out = new Uint8Array(cols * rows)
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++)
        out[row * cols + col] = keep(
          disk.map(([dx, dy]) => at(grid, col + dx, row + dy))
        )
          ? 1
          : 0
    return out
  }
  const grown = morph(swirl, (around) => around.some(Boolean))
  // Ground reachable from outside the grown shape is outside the artwork.
  const outside = new Uint8Array(cols * rows)
  const queue = [0]
  outside[0] = 1
  while (queue.length) {
    const i = queue.pop()
    const col = i % cols
    const row = (i - col) / cols
    for (const [c, w] of [
      [col - 1, row],
      [col + 1, row],
      [col, row - 1],
      [col, row + 1]
    ]) {
      const j = w * cols + c
      if (c < 0 || w < 0 || c >= cols || w >= rows || outside[j] || grown[j])
        continue
      outside[j] = 1
      queue.push(j)
    }
  }
  const shape = morph(
    outside.map((o) => 1 - o),
    (around) => around.every(Boolean)
  )
  // The largest all-filled rectangle, row by row over column heights.
  const heights = new Array(cols).fill(0)
  let best = { area: 0, col: 0, row: 0, w: 0, h: 0 }
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++)
      heights[col] = shape[row * cols + col] ? heights[col] + 1 : 0
    const stack = []
    for (let col = 0; col <= cols; col++) {
      const h = col < cols ? heights[col] : 0
      let start = col
      while (stack.length && stack.at(-1)[1] >= h) {
        const [from, top] = stack.pop()
        if (top * (col - from) > best.area)
          best = {
            area: top * (col - from),
            col: from,
            row: row - top + 1,
            w: col - from,
            h: top
          }
        start = from
      }
      stack.push([start, h])
    }
  }
  if (best.w < 2 || best.h < 2)
    throw new Error('The swirls fill no area the pattern can show')
  // Cell centres are what was tested, so the rectangle runs between them.
  return [
    ox + (best.col + 0.5) * cell,
    oy + (best.row + 0.5) * cell,
    (best.w - 1) * cell,
    (best.h - 1) * cell
  ]
    .map(Math.round)
    .join(' ')
}

/**
 * Whether a point is on a swirl, by the nonzero rule SVG fills with.
 *
 * @param {string[]} paths
 * @returns {(x: number, y: number) => boolean}
 */
export function swirlAt(paths) {
  const edges = outlinesOf(paths).map((subpaths) =>
    subpaths.flatMap((poly) =>
      poly.map((p, i) => [p, poly[(i + 1) % poly.length]])
    )
  )
  return (x, y) =>
    edges.some((pathEdges) => {
      let winding = 0
      for (const [[ax, ay], [bx, by]] of pathEdges)
        if (ay <= y !== by <= y && ax + ((y - ay) / (by - ay)) * (bx - ax) > x)
          winding += by > ay ? 1 : -1
      return winding !== 0
    })
}

const SOURCE_URL = new URL(SOURCE, PATTERN_DIR)

if (import.meta.main) {
  const shapes = extractPattern(readFileSync(SOURCE_URL, 'utf8'))
  writeFileSync(
    new URL('shapes.json', PATTERN_DIR),
    `${JSON.stringify(shapes, null, 2)}\n`
  )
  console.log(`safe ${shapes.safe} of ${shapes.viewBox}`)
}
