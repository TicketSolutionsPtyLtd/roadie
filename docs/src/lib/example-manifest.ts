import { createProcessor } from '@mdx-js/mdx'
import { glob, readFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import {
  collectLiveExamples,
  exampleHref,
  pageSlugOf
} from './live-examples.mjs'
import { readPageMetadata } from './page-manifest'

export type ManifestExample = {
  page: string
  pageTitle: string
  id: string
  href: string
  /** The docs page, scrolled to the example's heading. */
  backHref: string
  heading: string | undefined
  language: string
  code: string
  previewLayout: string | undefined
}

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '../app')

async function readPageExamples(path: string): Promise<ManifestExample[]> {
  const page = pageSlugOf(path)
  if (!page) return []
  const [source, metadata] = await Promise.all([
    readFile(path, 'utf-8'),
    readPageMetadata(path)
  ])
  const tree = createProcessor().parse(source)
  return collectLiveExamples(tree).map(
    ({ id, anchor, heading, language, code, previewLayout }) => ({
      page,
      pageTitle: metadata?.title ?? page,
      id,
      href: exampleHref(page, id),
      backHref: `/${page}/${anchor ? `#${anchor}` : ''}`,
      heading,
      language,
      code,
      previewLayout
    })
  )
}

let manifest: Promise<ManifestExample[]> | undefined

/** Every live example in the MDX pages, in page then document order. */
export function getLiveExamples(): Promise<ManifestExample[]> {
  manifest ??= (async () => {
    const paths = (await Array.fromAsync(glob('**/page.mdx', { cwd: APP_DIR })))
      .map((path) => join(APP_DIR, path))
      .sort()
    return (await Promise.all(paths.map(readPageExamples))).flat()
  })()
  return manifest
}

export async function getLiveExample(
  page: string,
  id: string
): Promise<ManifestExample | undefined> {
  return (await getLiveExamples()).find(
    (example) => example.page === page && example.id === id
  )
}
