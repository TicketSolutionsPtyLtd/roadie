import {
  type DocsPage,
  folderPage,
  missingStatus,
  pageForComponent,
  parseDocsPage
} from './docs'

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

  it('takes the first tsx fence under Usage when there is no tsx-live fence', () => {
    const mdx = [
      '## Import',
      '',
      '```tsx',
      "import { Cart } from '@oztix/roadie-widgets/cart'",
      '```',
      '',
      '## Usage',
      '',
      '```bash',
      'pnpm add cart',
      '```',
      '',
      '```tsx',
      '<Cart />',
      '```',
      '',
      '## Props'
    ].join('\n')
    expect(parseDocsPage(mdx, '/x/').example).toBe('<Cart />')
    expect(
      parseDocsPage(mdx.replace('## Usage', '## Setup'), '/x/').example
    ).toBeUndefined()
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

describe('parseDocsPage status', () => {
  it('fails on a status other than alpha, beta, stable, and deprecated', () => {
    expect(() =>
      parseDocsPage(
        "export const metadata = {\n  title: 'Badge',\n  status: 'experimental'\n}\n",
        '/components/badge/'
      )
    ).toThrow("/components/badge/ has status 'experimental'")
  })
})

describe('missingStatus', () => {
  const withStatus = (route: string, status?: string): DocsPage => ({
    route,
    components: [],
    status
  })

  it.each([
    ['a component page, props table or not', '/components/record-board/'],
    ['a chart page', '/charts/bar-chart/']
  ])('names %s that is its own page and sets no status', (_, route) => {
    expect(missingStatus({ page: withStatus(route), own: true })).toBe(route)
  })

  it.each([
    [
      'sets a status',
      { page: withStatus('/components/a/', 'beta'), own: true }
    ],
    [
      'is a foundation',
      { page: withStatus('/foundations/theming/'), own: true }
    ],
    [
      'only lists the component',
      { page: withStatus('/charts/dashboards/'), own: false }
    ],
    ['is missing', undefined]
  ])('passes a page that %s', (_, match) => {
    expect(missingStatus(match)).toBeUndefined()
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
    page('/components/select/', ['Select']),
    page('/foundations/records/', [])
  ]

  it.each([
    ['Button', '/components/button/', true],
    ['IconButton', '/components/icon-button/', true],
    ['RecordValue', '/components/record-table/', false],
    // A page that lists it beats one that only shares its name.
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

describe('folderPage', () => {
  const pages = [
    page('/components/record-board/', []),
    page('/charts/line-chart/', ['LineChart'])
  ]

  it.each([
    ['./dist/components/RecordBoard/index.js', '/components/record-board/'],
    ['./dist/LineChart/index.js', '/charts/line-chart/']
  ])('finds the page of the component folder %s', (target, route) => {
    expect(folderPage(pages, target)?.page.route).toBe(route)
  })

  it('reports a component folder with no page', () => {
    expect(folderPage(pages, './dist/components/Gone/index.js')).toBeNull()
  })

  it.each(['./dist/tables/index.js', './dist/index.js', './dist/hooks/a.js'])(
    'skips %s, which is no component folder',
    (target) => {
      expect(folderPage(pages, target)).toBeUndefined()
    }
  )
})
