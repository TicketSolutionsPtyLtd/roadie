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

export function parse(d: string) {
  const path = PK.FromSVGString(d)
  if (!path) throw new Error(`path data doesn't parse: ${d.slice(0, 40)}`)
  return path
}
