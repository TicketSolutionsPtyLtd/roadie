import { type DocsPage, pageForComponent, parseDocsPage } from './docs'

const page = (route: string, componentPaths: string[]): DocsPage => ({
  route,
  componentPaths
})

describe('parseDocsPage', () => {
  it.each([
    [
      "<PropsDefinitions componentPath='packages/a/src/Badge' />",
      ['packages/a/src/Badge']
    ],
    [
      '<PropsDefinitions componentPath="packages/a/src/Badge/index.tsx" />',
      ['packages/a/src/Badge/index.tsx']
    ],
    [
      "<PropsDefinitions\n  componentPath={[\n    'a/One.tsx',\n    'a/Two.tsx'\n  ]}\n/>",
      ['a/One.tsx', 'a/Two.tsx']
    ],
    ['No props here.', []]
  ])('reads component paths from %j', (mdx, expected) => {
    expect(parseDocsPage(mdx, '/x/').componentPaths).toEqual(expected)
  })

  it('takes the first tsx-live fence, skipping plain tsx fences', () => {
    const mdx = [
      '```tsx',
      "import { Badge } from '@oztix/roadie-components/badge'",
      '```',
      '',
      '```tsx-live',
      '<Badge>One</Badge>',
      '```',
      '',
      '```tsx-live',
      '<Badge>Two</Badge>',
      '```'
    ].join('\n')
    expect(parseDocsPage(mdx, '/x/').example).toBe('<Badge>One</Badge>')
  })

  it('reads the description and status from the metadata export', () => {
    const mdx =
      "export const metadata = {\n  title: 'Badge',\n  description: \"A compact label\",\n  status: 'beta',\n}\n"
    expect(parseDocsPage(mdx, '/components/badge/')).toEqual({
      route: '/components/badge/',
      componentPaths: [],
      description: 'A compact label',
      status: 'beta',
      example: undefined
    })
  })
})

describe('pageForComponent', () => {
  const pages = [
    page('/components/button/', ['p/Button/index.tsx']),
    page('/components/icon-button/', ['p/Button/IconButton.tsx']),
    page('/components/record-table/', [
      'p/RecordTable',
      'p/Records',
      'p/Records/RecordValue.tsx'
    ]),
    page('/charts/data-card/', ['p/DataCard'])
  ]

  it.each([
    ['Button', 'p/Button', '/components/button/'],
    ['IconButton', 'p/Button', '/components/icon-button/'],
    ['RecordValue', 'p/Records', '/components/record-table/'],
    ['Records', 'p/Records', '/components/record-table/'],
    ['DataCard', 'p/DataCard', '/charts/data-card/'],
    ['ButtonGroup', 'p/Button', undefined]
  ])('finds the page for %s', (name, dir, route) => {
    expect(pageForComponent(pages, name, dir)?.route).toBe(route)
  })
})
