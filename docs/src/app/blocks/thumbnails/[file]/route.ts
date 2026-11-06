import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { catalogue } from '@oztix/roadie-blocks/catalogue'

export const dynamic = 'force-static'
export const dynamicParams = false

const THUMBNAILS = join(
  process.cwd(),
  'node_modules/@oztix/roadie-blocks/src/thumbnails'
)

type Context = { params: Promise<{ file: string }> }

// Served as an app serves the package's thumbnails, for the editor's tiles.
export function generateStaticParams() {
  return catalogue.flatMap(({ presets }) =>
    presets.map(({ thumbnail }) => ({ file: thumbnail }))
  )
}

export async function GET(_request: Request, { params }: Context) {
  const { file } = await params
  return new Response(await readFile(join(THUMBNAILS, file)), {
    headers: { 'Content-Type': 'image/svg+xml' }
  })
}
