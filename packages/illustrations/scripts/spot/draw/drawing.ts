import {
  BOX,
  FILL_LAYERS,
  type FillLayer,
  OUTLINE_WIDTH,
  STROKE
} from '../format.ts'
import type { Point } from '../geometry.ts'
import { bounds } from '../normalise.ts'
import type { Path } from '../pathkit.ts'
import { type SideRule, extrude } from './extrude.ts'
import { union } from './shapes.ts'

export type Part = {
  layer: FillLayer
  shape: Path
  /**
   * Drawn on the front without adding to its silhouette, so it casts no
   * extrusion: a window, a label, the inside of a bell.
   */
  inner?: boolean
}

/** A spot illustration as parts, painted back to front over its extrusion. */
export type Drawing = {
  /** Fronts, in paint order: a part that attaches (a handle, a knob) goes before the body. */
  parts: Part[]
  /** Which way the depth goes, and how far, in the drawing's own units. */
  vector: Point
  /** Lines drawn on top that bound no fill, such as grip marks. */
  lines?: Path[]
  /** Picks each extruded side's layer; by default a hole's walls are Detail and the rest Shadow. */
  side?: SideRule
}

function simplified(path: Path) {
  const p = path.copy()
  if (!p.simplify()) throw new Error("Skia couldn't simplify a shape")
  const d = p.toSVGString()
  p.delete()
  return d
}

type Item = { layer: FillLayer | null; path: Path; stroked: boolean }

const LIVE = BOX - OUTLINE_WIDTH * 2

/**
 * Scales and centres paths in place so their long side spans the live area,
 * growing art as readily as shrinking it. Returns the scale.
 */
export function fit(paths: Path[]) {
  const { minX, minY, maxX, maxY } = bounds(paths)
  const k = LIVE / Math.max(maxX - minX, maxY - minY)
  const dx = BOX / 2 - (k * (minX + maxX)) / 2
  const dy = BOX / 2 - (k * (minY + maxY)) / 2
  for (const p of paths) p.transform(k, 0, dx, 0, k, dy, 0, 0, 1)
  return k
}

/**
 * Writes items as an SVG in paint order, each fill stroked as its own shape,
 * for `spot:convert` to merge into layers and cut back the hidden lines.
 */
export function toRoughSvg(items: Item[]) {
  const stroke = `stroke="${STROKE.colour}" stroke-width="${STROKE.width}" stroke-linecap="round" stroke-linejoin="round"`
  const paths = items.map(({ layer, path, stroked }) => {
    // Simplified, contours don't overlap, so even-odd keeps holes however Skia wound them.
    const d = layer ? simplified(path) : path.toSVGString()
    const fill = layer
      ? `fill="${FILL_LAYERS[layer]}" fill-rule="evenodd"`
      : 'fill="none"'
    return `<path ${fill}${stroked ? ` ${stroke}` : ''} d="${d}"/>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}">${paths.join('')}</svg>`
}

/** Extrudes, paints, and fits a drawing, ready for `spot:convert`. */
export function draw({ parts, vector, lines = [], side }: Drawing) {
  const front = union(...parts.filter((p) => !p.inner).map((p) => p.shape))
  const { back, faces } = extrude(front, vector, { side })
  const items: Item[] = [
    { layer: 'Shadow', path: back, stroked: false },
    ...faces.map((f) => ({ layer: f.layer, path: f.path, stroked: true })),
    ...parts.map((p) => ({
      layer: p.layer,
      path: p.shape.copy(),
      stroked: true
    })),
    ...lines.map((l) => ({ layer: null, path: l.copy(), stroked: true }))
  ]
  const scale = fit(items.map((i) => i.path))
  return { svg: toRoughSvg(items), scale, faces: faces.length }
}
