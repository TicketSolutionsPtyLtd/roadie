import GithubSlugger from 'github-slugger'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { movedEditorSection, movedEditorSections } from './movedSections'

const APP_DIR = join(import.meta.dirname, '../../app')

function anchorsOn(route: string) {
  const slugger = new GithubSlugger()
  return readFileSync(join(APP_DIR, route, 'page.mdx'), 'utf8')
    .split('\n')
    .filter((line) => /^#{2,4} /.test(line))
    .map((line) => slugger.slug(line.replace(/^#+ /, '')))
}

describe('movedEditorSection', () => {
  it.each([
    [
      '#importing-existing-html',
      '/components/editor/saved-content/#importing-existing-html'
    ],
    [
      '#rendering-saved-content',
      '/components/editor/saved-content/#rendering-saved-content'
    ],
    ['#with-content', '/components/editor/basic-and-rich/#default'],
    ['#tables', '/components/editor/basic-and-rich/#tables'],
    ['#blocks-preset', '/components/editor/blocks/#default'],
    ['#custom-blocks', '/components/editor/blocks/#custom-blocks'],
    ['#email-preset', '/components/editor/email/#default'],
    ['#conditions', '/components/editor/email/#conditions']
  ])('sends %s to %s', (hash, href) => {
    expect(movedEditorSection(hash)).toBe(href)
  })

  it.each(['', '#sizes', '#toolbar-emphasis', '#api-reference'])(
    'keeps %j, which is still on the Editor page',
    (hash) => {
      expect(movedEditorSection(hash)).toBeUndefined()
    }
  )

  it.each(movedEditorSections())(
    'sends #%s to a heading on its new page, %s',
    (_from, href) => {
      const [route, anchor] = href.split('/#')
      expect(anchorsOn(route!)).toContain(anchor)
    }
  )

  it.each(movedEditorSections())(
    'sends #%s away, as no heading on the Editor page keeps it',
    (from) => {
      expect(anchorsOn('components/editor')).not.toContain(from)
    }
  )
})
