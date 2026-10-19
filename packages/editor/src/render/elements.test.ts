import { describe, expect, it } from 'vitest'

import { presetElementsFor } from './elements'

// `migrate` already removes these, so the renderers' own checks are only
// reachable here, below it.
describe('presetElementsFor, below migrate', () => {
  const { nodes, marks } = presetElementsFor('rich')
  const context = { embedProviders: undefined }

  it.each(['javascript:alert(1)', 'JaVa\tscript:alert(1)', 'data:text/html,x'])(
    'renders no link for %s',
    (href) => {
      expect(marks.link!({ href }, context)).toBeNull()
    }
  )

  it('renders a safe link', () => {
    expect(marks.link!({ href: '/events/123' }, context)).toEqual({
      tag: 'a',
      attrs: { href: '/events/123' }
    })
  })

  it.each([
    'javascript:alert(1)',
    'http://example.com/a.webp',
    '//evil.test/a.webp'
  ])('renders no image for %s', (src) => {
    expect(nodes.image!({ src, alt: 'x' }, context)).toBeNull()
  })

  it.each([
    ['text', { colspan: '2 onclick=x', rowspan: '2' }],
    ['a fraction', { colspan: 1.5, rowspan: 2.5 }],
    ['a span of 1', { colspan: 1, rowspan: 1 }]
  ])('renders a cell with spans of %s as no spans', (_, attrs) => {
    expect(nodes.tableCell!(attrs, context)).toEqual({ tag: 'td', attrs: {} })
  })
})
