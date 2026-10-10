import type { Root } from 'mdast'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import remarkGfm from 'remark-gfm'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { describe, expect, it } from 'vitest'

import { BUILT_IN } from './llms'
import { TWIN_COMPONENTS } from './twin-components'

const APP = join(import.meta.dirname, '../app')

function docsComponentsUsed() {
  const used = new Map<string, string>()
  const pages = readdirSync(APP, { recursive: true, encoding: 'utf8' }).filter(
    (file) => file.endsWith('page.mdx')
  )
  for (const page of pages) {
    const tree = unified()
      .use(remarkParse)
      .use(remarkMdx)
      .use(remarkGfm)
      .parse(readFileSync(join(APP, page), 'utf8')) as Root
    const docsOnly = new Set<string>()
    visit(tree, 'mdxjsEsm', (node) => {
      for (const statement of node.data?.estree?.body ?? [])
        if (
          statement.type === 'ImportDeclaration' &&
          String(statement.source.value).startsWith('@/')
        )
          for (const specifier of statement.specifiers)
            docsOnly.add(specifier.local.name)
    })
    visit(tree, ['mdxJsxFlowElement', 'mdxJsxTextElement'], (node) => {
      const root = (node as { name?: string }).name?.split('.')[0]
      if (root && docsOnly.has(root) && !BUILT_IN.has(root))
        used.set(root, page)
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
