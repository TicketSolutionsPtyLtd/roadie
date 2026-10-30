import { readFile } from 'fs/promises'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

import { parseDocsPage } from '../../../packages/core/scripts/manifest/docs'
import { manifestComponents } from './manifest'

const APP = join(__dirname, '../app')
const routeOf = (docs: string) =>
  new URL(docs).pathname.replace(/^\/roadie/, '')

async function propsDefinitionsOn(route: string): Promise<string[]> {
  const mdx = await readFile(join(APP, route, 'page.mdx'), 'utf8')
  return parseDocsPage(mdx, route).components
}

// The manifest links a compound to one page, and both the site and the
// markdown copy put its API reference there, so the page must place it.
describe('compound API references', () => {
  const compounds = manifestComponents().filter(
    (component) => component.docs && component.parts?.length
  )

  it.each(compounds.map((component) => [component.name, component.docs!]))(
    'places %s on the page its manifest links to',
    async (name, docs) => {
      expect(await propsDefinitionsOn(routeOf(docs))).toContain(name)
    }
  )
})
