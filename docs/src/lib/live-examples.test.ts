import { createProcessor } from '@mdx-js/mdx'
import { describe, expect, it } from 'vitest'

import { getLiveExamples } from './example-manifest'
import remarkLiveExamples, {
  collectLiveExamples,
  exampleHref,
  pageSlugOf
} from './live-examples.mjs'

const parse = (source: string) => createProcessor().parse(source)
const ids = (source: string) =>
  collectLiveExamples(parse(source)).map(({ id }) => id)

describe('collectLiveExamples', () => {
  it('names each live fence after the nearest heading, numbering repeats', () => {
    const source = [
      '# Number field',
      '```tsx-live\n<A />\n```',
      '## Default',
      '```tsx-live-noinline\nrender(<B />)\n```',
      '```tsx\nnot live\n```',
      '```tsx-live-noinline-expand\nrender(<C />)\n```',
      '## With `search`',
      '```jsx-live\n<D />\n```'
    ].join('\n\n')

    expect(ids(source)).toEqual([
      'number-field',
      'default',
      'default-2',
      'with-search'
    ])
  })

  it('slugs repeated headings like rehype-slug, so ids stay unique', () => {
    const source = [
      '## Usage',
      '```tsx-live\n<A />\n```',
      '## Usage',
      '```tsx-live\n<B />\n```'
    ].join('\n\n')

    const examples = collectLiveExamples(parse(source))
    expect(examples.map(({ id }) => id)).toEqual(['usage', 'usage-1'])
    expect(examples.map(({ anchor }) => anchor)).toEqual(['usage', 'usage-1'])
  })

  it('takes an explicit id and the eager flag from the fence meta', () => {
    const source = [
      '```tsx-live id=orders eager\n<A />\n```',
      '```tsx-live\n<B />\n```'
    ].join('\n\n')

    const [orders, second] = collectLiveExamples(parse(source))
    expect(orders).toMatchObject({ id: 'orders', eager: true, code: '<A />' })
    expect(second).toMatchObject({ id: 'example', eager: false })
  })

  it('rejects a duplicate or malformed explicit id', () => {
    const twice = '```tsx-live id=a\n<A />\n```\n\n```tsx-live id=a\n<B />\n```'
    expect(() => ids(twice)).toThrow(/used twice/)
    expect(() => ids('```tsx-live id=Orders\n<A />\n```')).toThrow(/kebab/)
  })

  it('keeps generated ids clear of explicit ones', () => {
    const source = [
      '## Default',
      '```tsx-live id=default\n<A />\n```',
      '```tsx-live\n<B />\n```'
    ].join('\n\n')
    expect(ids(source)).toEqual(['default', 'default-2'])
  })

  it('keeps generated ids clear of explicit ones declared later', () => {
    const source = [
      '## Default',
      '```tsx-live\n<A />\n```',
      '```tsx-live id=default\n<B />\n```'
    ].join('\n\n')
    expect(ids(source)).toEqual(['default-2', 'default'])
  })
})

describe('pageSlugOf', () => {
  it('reads the route from a page path and ignores other files', () => {
    expect(
      pageSlugOf('/repo/docs/src/app/components/number-field/page.mdx')
    ).toBe('components/number-field')
    expect(pageSlugOf('/repo/docs/src/app/components/x/notes.mdx')).toBe(
      undefined
    )
    expect(exampleHref('components/number-field', 'default')).toBe(
      '/examples/components/number-field/default/'
    )
  })
})

describe('remarkLiveExamples', () => {
  it('tags live fences with their id and page for CodePreview', async () => {
    const processor = createProcessor({ remarkPlugins: [remarkLiveExamples] })
    const file = {
      path: '/repo/docs/src/app/components/badge/page.mdx',
      value: '## Default\n\n```tsx-live eager\n<Badge />\n```'
    }
    const compiled = String(await processor.process(file))

    expect(compiled).toContain('"data-example-id": "default"')
    expect(compiled).toContain('"data-example-page": "components/badge"')
    expect(compiled).toContain('"data-example-eager": ""')
  })
})

describe('getLiveExamples', () => {
  it('lists every live example on the number field page with stable ids', async () => {
    const examples = (await getLiveExamples()).filter(
      ({ page }) => page === 'components/number-field'
    )

    expect(examples.length).toBeGreaterThan(10)
    expect(examples[0]).toMatchObject({
      page: 'components/number-field',
      pageTitle: 'Number field',
      href: expect.stringMatching(/^\/examples\/components\/number-field\//)
    })
    expect(new Set(examples.map(({ id }) => id)).size).toBe(examples.length)
  })

  it('gives every example across the docs a unique route', async () => {
    const hrefs = (await getLiveExamples()).map(({ href }) => href)
    expect(hrefs.length).toBeGreaterThan(400)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})
