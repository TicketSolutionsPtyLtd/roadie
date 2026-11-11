import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

/** The slice of Skia's PathKit the spot scripts use. It ships no types. */
export interface Path {
  copy(): Path
  delete(): void
  op(other: Path, op: number): Path | null
  simplify(): Path | null
  stroke(options: { width: number; join?: number; cap?: number }): Path | null
  setFillType(type: number): void
  transform(...matrix: number[]): Path
  computeTightBounds(): {
    fLeft: number
    fTop: number
    fRight: number
    fBottom: number
  }
  toCmds(): number[][]
  toSVGString(): string
}

interface PathKit {
  FromSVGString(d: string): Path | null
  NewPath(): Path
  PathOp: { UNION: number; DIFFERENCE: number; INTERSECT: number }
  FillType: { WINDING: number; EVENODD: number }
  StrokeJoin: { ROUND: number }
  StrokeCap: { ROUND: number }
  MOVE_VERB: number
  LINE_VERB: number
  QUAD_VERB: number
  CONIC_VERB: number
  CUBIC_VERB: number
  CLOSE_VERB: number
}

const require = createRequire(import.meta.url)
const entry = require.resolve('pathkit-wasm/bin/pathkit.js')
const init = require(entry) as (options: {
  wasmBinary: Buffer
}) => Promise<PathKit>

// Node can't fetch a file path, so the WASM is handed over as bytes.
export const PK = await init({
  wasmBinary: readFileSync(join(dirname(entry), 'pathkit.wasm'))
})

const NUMBER = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y
const FLAG = /[01]/y
const COMMAND = /[a-zA-Z]/y
const SEPARATOR = /[\s,]*/y
const ARC_PARAMS = 7

/**
 * Path data with every arc flag spaced out. PathKit only reads flags written
 * apart, as in `a5 5 0 0 1 10 0`, and minifiers run them together:
 * `a5 5 0 0110 0`.
 */
export function spaceArcFlags(d: string) {
  if (!/[aA]/.test(d)) return d
  const tokens: string[] = []
  let at = 0
  let command = ''
  let param = 0
  const read = (pattern: RegExp) => {
    pattern.lastIndex = at
    const match = pattern.exec(d)?.[0]
    if (match !== undefined) at = pattern.lastIndex
    return match
  }
  for (;;) {
    read(SEPARATOR)
    if (at >= d.length) return tokens.join(' ')
    const letter = read(COMMAND)
    if (letter) {
      tokens.push(letter)
      command = letter
      param = 0
      continue
    }
    const flag = /[aA]/.test(command) && [3, 4].includes(param % ARC_PARAMS)
    const token = read(flag ? FLAG : NUMBER)
    // Left as written, so PathKit reports what's wrong with it.
    if (token === undefined) return d
    tokens.push(token)
    param++
  }
}

export function tryParse(d: string) {
  return PK.FromSVGString(spaceArcFlags(d))
}

export function parse(d: string) {
  const path = tryParse(d)
  if (!path) throw new Error(`path data doesn't parse: ${d.slice(0, 40)}`)
  return path
}
