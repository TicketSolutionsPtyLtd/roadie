import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

import { DRAWINGS } from './draw.ts'
import { componentName } from './generate.ts'

const USAGE = `Usage: pnpm spot:new <name>

Starts drawings/<name>.ts, a spot illustration drawn in code. Shape it, then
run spot:draw <name> to make its source and component.`

const NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

/** A drawing to start from: one rounded block, extruded down and right. */
export const template = (
  slug: string
) => `import { type Drawing, rect } from '../scripts/spot/draw/index.ts'

// The ${slug.replaceAll('-', ' ')} spot illustration. Draw the front flat, in any
// units: spot:draw sweeps it back along \`vector\` and fits it to the box.
// The style guide is in the package README.
export default {
  parts: [{ layer: 'Face', shape: rect(0, 0, 32, 24, 3) }],
  vector: [3, 3]
} satisfies Drawing
`

if (import.meta.main) {
  const { positionals } = parseArgs({ allowPositionals: true })
  const [slug] = positionals
  if (!slug || positionals.length > 1) {
    console.log(USAGE)
    process.exit(2)
  }
  if (!NAME.test(slug)) {
    console.error(
      `${slug}: name it in kebab-case and start it with a letter, such as map-pin`
    )
    process.exit(1)
  }
  const file = join(DRAWINGS, `${slug}.ts`)
  if (existsSync(file)) {
    console.error(`drawings/${slug}.ts already exists`)
    process.exit(1)
  }
  mkdirSync(DRAWINGS, { recursive: true })
  writeFileSync(file, template(slug))
  console.log(`Started drawings/${slug}.ts, which becomes <${componentName(slug)} />.
Next: shape it, then pnpm spot:draw ${slug} --preview ${slug}.png`)
}
