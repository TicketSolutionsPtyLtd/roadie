import { existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright'

import { layersOf } from './check.ts'
import {
  BOX,
  FILL_LAYERS,
  type Layer,
  OUTLINE_COLOUR,
  OUTLINE_WIDTH,
  STROKE,
  assertName
} from './format.ts'
import { SVGS } from './generate.ts'

/** A spread of shapes, line weights, and shadow depths. */
export const DEFAULT_SET = [
  'caravan',
  'heart',
  'map-pin',
  'megaphone',
  'ticket',
  'wine-glass'
]

const USAGE = `Usage: pnpm spot:preview <name or file.svg>... [--with <names>] [--out <file.png>]

Renders spot illustrations beside some of the set, so you can see whether a new
or changed one belongs: large on the 48 grid, then at 96 and 48px, plain and
outlined, on light and dark.

--with  names from the set to compare against, comma separated
        (defaults to ${DEFAULT_SET.join(', ')})
--out   where to save the PNG (defaults to the OS temp folder)`

// The docs' page backgrounds, fixed here because the sheet is an image, not a themed page.
const THEMES = [
  { name: 'Light', background: '#ffffff', text: '#5b6170' },
  { name: 'Dark', background: '#16181d', text: '#a4abb8' }
] as const

/** A source drawn as `SpotIllustration` draws it, with or without the outline. */
export function previewSvg(layers: Layer[], outline: boolean) {
  const outlineWidth = OUTLINE_WIDTH * 2
  const behind = outline
    ? `<g fill="${OUTLINE_COLOUR}" fill-rule="evenodd" stroke="${OUTLINE_COLOUR}" stroke-width="${outlineWidth}" stroke-linecap="round" stroke-linejoin="round">${layers
        .map(
          ({ name, d }) =>
            `<path d="${d}"${name === 'Stroke' ? ' fill="none"' : ''}/>`
        )
        .join('')}</g>`
    : ''
  const art = layers
    .map(({ name, d }) =>
      name === 'Stroke'
        ? `<path d="${d}" fill="none" stroke="${STROKE.colour}" stroke-width="${STROKE.width}" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<path d="${d}" fill="${FILL_LAYERS[name]}" fill-rule="evenodd"/>`
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}" fill="none">${behind}${art}</svg>`
}

type Item = { name: string; layers: Layer[]; target: boolean }

function load(arg: string, target: boolean, calledFrom: string): Item {
  if (!arg.endsWith('.svg')) assertName(arg)
  const file = arg.endsWith('.svg')
    ? resolve(calledFrom, arg)
    : join(SVGS, `${arg}.svg`)
  if (!existsSync(file)) throw new Error(`there's no ${file}`)
  return {
    name: basename(file, '.svg'),
    layers: layersOf(readFileSync(file, 'utf8')),
    target
  }
}

const img = (svg: string, size: number) =>
  `<img width="${size}" height="${size}" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}">`

const GRID = 384
const INSET = (OUTLINE_WIDTH / BOX) * 100

function sheet(items: Item[]) {
  const targets = items.filter((i) => i.target)
  const cell = (i: Item, size: number, outline: boolean) =>
    `<td class="${i.target ? 'target' : ''}">${img(previewSvg(i.layers, outline), size)}</td>`
  const rows = THEMES.flatMap((theme) =>
    [false, true].flatMap((outline) =>
      [96, 48].map(
        (size) =>
          `<tr style="background:${theme.background};color:${theme.text}"><th>${theme.name}, ${size}px${outline ? ', outlined' : ''}</th>${items.map((i) => cell(i, size, outline)).join('')}</tr>`
      )
    )
  )
  const large = targets
    .map(
      (i) =>
        `<figure><div class="grid">${img(previewSvg(i.layers, false), GRID)}</div><figcaption>${i.name}, on the 48 grid; the dashed box is the art's limit</figcaption></figure>`
    )
    .join('')
  return `<!doctype html><style>
body{margin:0;padding:16px;background:#eceef2;font:12px system-ui;color:#2b303b;width:max-content}
.large{display:flex;gap:16px;margin-bottom:16px}
figure{margin:0}
.grid{position:relative;width:${GRID}px;height:${GRID}px;background:#fff;background-image:linear-gradient(#0000000f 1px,transparent 1px),linear-gradient(90deg,#0000000f 1px,transparent 1px);background-size:${GRID / BOX}px ${GRID / BOX}px}
.grid::after{content:'';position:absolute;inset:${INSET}%;outline:1px dashed #ff4d6d}
.grid img{position:relative;display:block}
table{border-collapse:collapse}
th{font-weight:500;text-align:left;padding:0 16px;white-space:nowrap}
thead th{text-align:center;padding:8px 4px}
td{width:112px;height:112px;text-align:center;vertical-align:middle;padding:0}
td.target{box-shadow:inset 0 0 0 2px #ff4d6d}
</style><body><div class="large">${large}</div><table><thead><tr><th></th>${items.map((i) => `<th>${i.name}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></body>`
}

/**
 * Renders the targets, names from the set or paths to sources, beside some of
 * the set, and saves the sheet as a PNG.
 */
export async function preview(
  targets: string[],
  {
    out,
    set = DEFAULT_SET,
    calledFrom = process.cwd()
  }: { out: string; set?: string[]; calledFrom?: string }
) {
  const shown = targets.map((t) => load(t, true, calledFrom))
  const names = new Set(shown.map((t) => t.name))
  const items = [
    ...shown,
    ...set.filter((n) => !names.has(n)).map((n) => load(n, false, calledFrom))
  ]
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ deviceScaleFactor: 2 })
    await page.setContent(sheet(items))
    await page.evaluate(() =>
      Promise.all([...document.images].map((i) => i.decode()))
    )
    await page.screenshot({ path: out, fullPage: true })
  } finally {
    await browser.close()
  }
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      with: { type: 'string' },
      out: { type: 'string' },
      help: { type: 'boolean' }
    }
  })
  if (values.help || positionals.length === 0) {
    console.log(USAGE)
    process.exit(values.help ? 0 : 2)
  }
  const calledFrom = process.env.INIT_CWD ?? process.cwd()
  const out = values.out
    ? resolve(calledFrom, values.out)
    : join(tmpdir(), `spot-preview-${Date.now()}.png`)
  await preview(positionals, {
    out,
    set: values.with?.split(','),
    calledFrom
  })
  console.log(`Preview: ${out}`)
}
