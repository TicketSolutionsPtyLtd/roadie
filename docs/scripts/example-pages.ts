import { copyFile, mkdir, readFile, readdir, rm } from 'node:fs/promises'
import path from 'node:path'

import { EXAMPLE_SHELL } from '../src/lib/example-code.ts'

const OUT = path.join(import.meta.dirname, '../out')
const SHELL = path.join(OUT, 'examples', EXAMPLE_SHELL)

/** Every example's address, from the per-page JSON `next build` wrote. */
async function exampleHrefs() {
  const codeDir = path.join(OUT, 'example-code')
  const files = (await readdir(codeDir, { recursive: true })).filter((file) =>
    file.endsWith('.json')
  )
  const pages = await Promise.all(
    files.map(async (file) => {
      const examples: { href: string }[] = JSON.parse(
        await readFile(path.join(codeDir, file), 'utf-8')
      )
      return examples.map(({ href }) => href)
    })
  )
  return pages.flat()
}

const shell = path.join(SHELL, 'index.html')
const hrefs = await exampleHrefs()
await Promise.all(
  hrefs.map(async (href) => {
    const dir = path.join(OUT, href)
    await mkdir(dir, { recursive: true })
    await copyFile(shell, path.join(dir, 'index.html'))
  })
)
await rm(SHELL, { recursive: true })
console.log(`Wrote ${hrefs.length} example pages from the shell`)
