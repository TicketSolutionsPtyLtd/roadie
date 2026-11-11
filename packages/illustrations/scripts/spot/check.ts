import { type CustomPlugin, optimize } from 'svgo'

import {
  BOX,
  FILL_LAYERS,
  type FillLayer,
  type Layer,
  OUTLINE_WIDTH,
  STROKE
} from './format.ts'
import { measure } from './measure.ts'
import { bounds } from './normalise.ts'
import { PK } from './pathkit.ts'

const FILE_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*\.svg$/
const ROOT_ATTRIBUTES = {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  viewBox: `0 0 ${BOX} ${BOX}`
}
const STROKE_ATTRIBUTES = {
  stroke: STROKE.colour,
  'stroke-width': String(STROKE.width),
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round'
}
const FIT_TOLERANCE = 0.05

type Element = { name: string; attributes: Record<string, string> }

function read(svg: string) {
  let root: Element | undefined
  const children: Element[] = []
  let nested = false
  const collect: CustomPlugin = {
    name: 'collectStructure',
    fn: () => ({
      element: {
        enter(node, parent) {
          if (parent.type === 'root') root = node
          else if (parent === root) children.push(node)
          else nested = true
        }
      }
    })
  }
  // Without plugins, optimize only parses; the collector sees the file as written.
  optimize(svg, { plugins: [collect] })
  return { root, children, nested }
}

/** A layer's attributes other than its name and path data. */
function paintOf({ attributes }: Element) {
  return Object.fromEntries(
    Object.entries(attributes).filter(([k]) => k !== 'id' && k !== 'd')
  )
}

function sameAttributes(
  actual: Record<string, string>,
  expected: Record<string, string>
) {
  const keys = new Set([...Object.keys(actual), ...Object.keys(expected)])
  return [...keys].every((k) =>
    k === 'stroke-width'
      ? Number(actual[k]) === Number(expected[k])
      : actual[k] === expected[k]
  )
}

/**
 * Checks a spot illustration's source against the format `spot:convert`
 * writes. Returns what's wrong, in words a designer can act on, or nothing.
 */
export function check(svg: string, fileName: string): string[] {
  const errors: string[] = []
  if (!FILE_NAME.test(fileName))
    errors.push(
      `${fileName}: name it in kebab-case and start it with a letter, such as map-pin.svg`
    )

  const { root, children, nested } = read(svg)
  if (!root || root.name !== 'svg') return [...errors, 'not an SVG']
  if (!sameAttributes(root.attributes, ROOT_ATTRIBUTES))
    errors.push(
      `the <svg> takes only ${Object.entries(ROOT_ATTRIBUTES)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ')}`
    )
  if (nested)
    errors.push(
      "groups and nested elements aren't allowed; each layer is one <path> in the <svg>"
    )

  const names = children.map((c) => c.attributes.id ?? `<${c.name}>`)
  const known = new Set<string>([...Object.keys(FILL_LAYERS), 'Stroke'])
  for (const c of children) {
    const id = c.attributes.id
    if (c.name !== 'path')
      errors.push(`<${c.name}> isn't a layer; draw everything as paths`)
    else if (id === 'Outline')
      errors.push("remove the Outline layer; it's drawn from the art")
    else if (!id || !known.has(id))
      errors.push(
        `${id ?? 'a path with no id'} isn't a layer; use ${[...known].join(', ')}`
      )
    else if (id === 'Stroke') {
      if (!sameAttributes(paintOf(c), STROKE_ATTRIBUTES))
        errors.push(
          `Stroke takes only ${Object.entries(STROKE_ATTRIBUTES)
            .map(([k, v]) => `${k}="${v}"`)
            .join(' ')}`
        )
    } else {
      const colour = FILL_LAYERS[id as FillLayer]
      if (!sameAttributes(paintOf(c), { fill: colour, 'fill-rule': 'evenodd' }))
        errors.push(`${id} takes only fill="${colour}" fill-rule="evenodd"`)
    }
    if (c.name === 'path' && !c.attributes.d)
      errors.push(`${id ?? 'a path'} has no path data`)
  }
  const repeated = names.filter((n, i) => names.indexOf(n) !== i)
  if (repeated.length)
    errors.push(
      `${[...new Set(repeated)].join(', ')} appears more than once; merge each layer into one path`
    )
  if (!names.includes('Stroke')) errors.push("there's no Stroke layer")
  else if (names.at(-1) !== 'Stroke')
    errors.push('Stroke has to be the last layer')
  if (!names.some((n) => n in FILL_LAYERS))
    errors.push('there are no fill layers')
  if (errors.length) return errors

  const parsed = children.map((c) => PK.FromSVGString(c.attributes.d!))
  const paths = parsed.filter((p) => p !== null)
  const unparsed = names.filter((_, i) => parsed[i] === null)
  if (unparsed.length) {
    for (const p of paths) p.delete()
    return unparsed.map((n) => `${n}'s path data doesn't parse`)
  }
  const { minX, minY, maxX, maxY } = bounds(paths)
  for (const p of paths) p.delete()
  const lo = OUTLINE_WIDTH - FIT_TOLERANCE
  const hi = BOX - OUTLINE_WIDTH + FIT_TOLERANCE
  if (minX < lo || minY < lo || maxX > hi || maxY > hi)
    errors.push(
      `the art reaches ${[minX, minY, BOX - maxX, BOX - maxY].map((v) => v.toFixed(2)).join(', ')} from the left, top, right, and bottom edges; keep it ${OUTLINE_WIDTH} inside so the outline fits (spot:convert shrinks it for you)`
    )
  return errors
}

/** The layers of a source that passes the check, back to front. */
export function layersOf(svg: string): Layer[] {
  return read(svg).children.map((c) => ({
    name: c.attributes.id as Layer['name'],
    d: c.attributes.d!
  }))
}

export type StyleRule =
  | 'coverage'
  | 'long-side'
  | 'shadow-share'
  | 'stroke-share'
  | 'shadow-direction'
  | 'commands'

/** Drawn this way on purpose, so their warnings are expected. */
export const ACCEPTED: Record<string, StyleRule[]> = {
  // Its petals spin, so the shadow trails up and left.
  'flower-spiral': ['shadow-direction']
}

/** The set's measured range for each rule, a little wider so the set itself passes. */
export const STYLE = {
  coverage: [0.35, 0.63],
  longSide: 42.9,
  shadowShare: [0.025, 0.3],
  strokeShare: [0.07, 0.18],
  commands: 400
} as const

const pct = (n: number) => `${Math.round(n * 100)}%`

/**
 * Where a source strays from how the set is drawn. These never fail the
 * check: an illustration can break a rule on purpose, so each is a prompt to
 * look at the preview.
 */
export function styleWarnings(
  layers: Layer[],
  name?: string
): { rule: StyleRule; message: string }[] {
  const m = measure(layers)
  const out: { rule: StyleRule; message: string }[] = []
  const [minCover, maxCover] = STYLE.coverage
  if (m.coverage < minCover || m.coverage > maxCover)
    out.push({
      rule: 'coverage',
      message: `it paints ${pct(m.coverage)} of the box; the set paints ${pct(minCover)} to ${pct(maxCover)}, so it will look ${m.coverage < minCover ? 'faint' : 'heavy'} beside them`
    })
  if (m.longSide < STYLE.longSide)
    out.push({
      rule: 'long-side',
      message: `its long side spans ${m.longSide.toFixed(1)}; stretch it to 44, from 2 to 46, like the rest of the set (fit() does it for you)`
    })
  const shadow = m.shares.Shadow ?? 0
  const [minShadow, maxShadow] = STYLE.shadowShare
  if (shadow < minShadow || shadow > maxShadow)
    out.push({
      rule: 'shadow-share',
      message: `Shadow is ${pct(shadow)} of what's painted; the set uses ${pct(minShadow)} to ${pct(maxShadow)}${shadow < minShadow ? ', so it will look flat' : ''}`
    })
  const stroke = m.shares.Stroke ?? 0
  const [minStroke, maxStroke] = STYLE.strokeShare
  if (stroke < minStroke || stroke > maxStroke)
    out.push({
      rule: 'stroke-share',
      message: `lines are ${pct(stroke)} of what's painted; the set uses ${pct(minStroke)} to ${pct(maxStroke)}${stroke > maxStroke ? ", so drop the inner line work it doesn't need to be recognised" : ''}`
    })
  if (m.shadowOffset && m.shadowOffset[0] < 0 && m.shadowOffset[1] < 0)
    out.push({
      rule: 'shadow-direction',
      message:
        'Shadow sits up and to the left of the art; the set extrudes down, right, or both'
    })
  for (const [layer, n] of Object.entries(m.commands))
    if (n > STYLE.commands)
      out.push({
        rule: 'commands',
        message: `${layer} has ${n} path commands; the most in the set is under 200, so it's likely sampled points rather than curves`
      })
  const accepted = new Set(
    name && Object.hasOwn(ACCEPTED, name) ? ACCEPTED[name] : []
  )
  return out.filter((w) => !accepted.has(w.rule))
}
