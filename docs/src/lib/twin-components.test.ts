import type { Root } from 'mdast'
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import remarkGfm from 'remark-gfm'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { describe, expect, it } from 'vitest'

import { BUILT_IN, docsOnlyNames } from './llms'
import { TWIN_COMPONENTS } from './twin-components'

const APP = join(import.meta.dirname, '../app')

/** Every JSX element name in an estree, such as a prop's `<RowDiagram />`. */
function jsxNames(tree: unknown, names: string[] = []): string[] {
  if (!tree || typeof tree !== 'object') return names
  const node = tree as { type?: string; name?: { name?: string } }
  if (node.type === 'JSXOpeningElement' && node.name?.name)
    names.push(node.name.name)
  for (const value of Object.values(tree)) jsxNames(value, names)
  return names
}

function docsComponentsUsed() {
  const used = new Set<string>()
  const pages = readdirSync(APP, { recursive: true, encoding: 'utf8' }).filter(
    (file) => file.endsWith('page.mdx')
  )
  for (const page of pages) {
    const tree = unified()
      .use(remarkParse)
      .use(remarkMdx)
      .use(remarkGfm)
      .parse(readFileSync(join(APP, page), 'utf8')) as Root
    const docsOnly = docsOnlyNames(tree)
    const use = (name: string) => {
      const root = name.split('.')[0]!
      if (docsOnly.has(root) && !BUILT_IN.has(root)) used.add(root)
    }
    visit(tree, ['mdxJsxFlowElement', 'mdxJsxTextElement'], (node) => {
      const element = node as MdxJsxFlowElement
      if (element.name) use(element.name)
      for (const attribute of element.attributes)
        jsxNames(attribute.value).forEach(use)
    })
  }
  return used
}

describe('TWIN_COMPONENTS', () => {
  const used = docsComponentsUsed()

  it('lists every docs component a page renders', () => {
    expect(
      [...used.keys()].filter((name) => !(name in TWIN_COMPONENTS))
    ).toEqual([])
  })

  it('lists nothing no page renders', () => {
    expect(
      Object.keys(TWIN_COMPONENTS).filter((name) => !used.has(name))
    ).toEqual([])
  })
})
