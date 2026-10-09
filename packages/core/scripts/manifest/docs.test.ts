import { type DocsPage, pageForComponent, parseDocsPage } from './docs'

const page = (route: string, components: string[]): DocsPage => ({
  route,
  components
})

describe('parseDocsPage', () => {
  it.each([
    ["<PropsDefinitions component='Badge' />", ['Badge']],
    ['<PropsDefinitions component="Badge" />', ['Badge']],
    [
      "<PropsDefinitions\n  component={[\n    'One',\n    'Two'\n  ]}\n/>",
      ['One', 'Two']
    ],
    ["<Demo subcomponent='Badge' />", []],
    ["<Slot component='Badge' />", []],
    ['No props here.', []]
  ])('reads component names from %j', (mdx, expected) => {
    expect(parseDocsPage(mdx, '/x/').components).toEqual(expected)
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

  it('reads metadata only from the metadata export and unescapes quotes', () => {
    const mdx = [
      'export const metadata = {',
      "  description: 'It\\'s a label',",
      '}',
      '',
      'export const event = {',
      "  status: 'sold-out',",
      '}'
    ].join('\n')
    expect(parseDocsPage(mdx, '/x/')).toMatchObject({
      description: "It's a label",
      status: undefined
    })
  })

  it('reads the description and status from the metadata export', () => {
    const mdx =
      "export const metadata = {\n  title: 'Badge',\n  description: \"A compact label\",\n  status: 'beta',\n}\n"
    expect(parseDocsPage(mdx, '/components/badge/')).toEqual({
      route: '/components/badge/',
      components: [],
      description: 'A compact label',
      status: 'beta',
      example: undefined
    })
  })
})

describe('pageForComponent', () => {
  const pages = [
    page('/components/button/', ['Button', 'IconButton']),
    page('/components/icon-button/', ['IconButton']),
    page('/components/record-table/', [
      'RecordTable',
      'Records',
      'RecordValue'
    ]),
    page('/charts/data-card/', ['DataCard']),
    page('/charts/forms/', ['Select']),
    page('/components/badge/', []),
    page('/patterns/select/', []),
    page('/components/select/', ['Select'])
  ]

  it.each([
    ['Button', '/components/button/', true],
    ['IconButton', '/components/icon-button/', true],
    ['RecordValue', '/components/record-table/', false],
    ['Records', '/components/record-table/', false],
    ['DataCard', '/charts/data-card/', true],
    ['Select', '/components/select/', true],
    ['Badge', '/components/badge/', true],
    ['ButtonGroup', undefined, undefined]
  ])('finds the page for %s', (name, route, own) => {
    expect(pageForComponent(pages, name)).toEqual(
      route === undefined
        ? undefined
        : { page: expect.objectContaining({ route }), own }
    )
  })
})
