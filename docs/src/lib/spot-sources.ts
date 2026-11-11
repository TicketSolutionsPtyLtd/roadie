import { zipSync } from 'fflate'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { SPOT_ILLUSTRATIONS } from '@oztix/roadie-illustrations/spot/catalogue'

// The package's own SVG sources, so the docs serve the files an app gets.
const SOURCES = join(
  process.cwd(),
  'node_modules/@oztix/roadie-illustrations/src/spot/svgs'
)

export const spotSource = (slug: string) =>
  readFile(join(SOURCES, `${slug}.svg`))

let pack: Promise<Uint8Array<ArrayBuffer>> | undefined

/** Every spot illustration's SVG in one zip, built once per build. */
export function illustrationPack(): Promise<Uint8Array<ArrayBuffer>> {
  pack ??= Promise.all(
    SPOT_ILLUSTRATIONS.map(
      async ({ slug }) =>
        [
          `spot-illustrations/oztix-${slug}.svg`,
          await spotSource(slug)
        ] as const
    )
  ).then((files) => {
    const zip = zipSync(Object.fromEntries(files), { level: 9 })
    // Copied onto a plain ArrayBuffer, which a Response body takes.
    const bytes = new Uint8Array(new ArrayBuffer(zip.byteLength))
    bytes.set(zip)
    return bytes
  })
  return pack
}

/** The pack's size, as a download card shows it, such as `98 KB`. */
export async function illustrationPackSize() {
  return `${Math.round((await illustrationPack()).byteLength / 1024)} KB`
}
