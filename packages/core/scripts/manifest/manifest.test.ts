import { fileURLToPath } from 'node:url'

import { buildManifest } from './manifest'

const workspaceRoot = fileURLToPath(
  new URL('./fixtures/workspace/', import.meta.url)
)
const documentedElsewhere = {
  '@fixture/ui': { Provider: '/overview/setup/#providers' },
  '@fixture/ui/pill': '/components/pill/'
}
const options = {
  packageDir: `${workspaceRoot}pkg`,
  workspaceRoot,
  docsUrl: 'https://example.com/docs/',
  documentedElsewhere
}
const manifest = buildManifest(options)

describe('buildManifest', () => {
  it('names the package, version and docs site', () => {
    expect(manifest).toMatchObject({
      schemaVersion: 1,
      package: '@fixture/ui',
      version: '1.2.3',
      docs: 'https://example.com/docs/'
    })
  })

  it('lists every exports subpath with its import path and names', () => {
    expect(manifest.exports).toEqual([
      {
        subpath: '.',
        import: '@fixture/ui',
        kind: 'js',
        values: [
          'DEFAULT_THEME',
          'Pill',
          'Provider',
          'Tag',
          'ThemeError',
          'useTheme'
        ],
        types: ['PillProps']
      },
      { subpath: './css', import: '@fixture/ui/css', kind: 'css' },
      {
        subpath: './pill',
        import: '@fixture/ui/pill',
        kind: 'js',
        values: ['Pill', 'Tag'],
        types: ['PillProps']
      },
      {
        subpath: './theme',
        import: '@fixture/ui/theme',
        kind: 'js',
        values: ['DEFAULT_THEME', 'useTheme']
      },
      {
        subpath: './roadie.manifest.json',
        import: '@fixture/ui/roadie.manifest.json',
        kind: 'json'
      }
    ])
  })

  it('describes a component with its docs page, first live example, and props and literals in declaration order', () => {
    const pill = manifest.components.find((c) => c.name === 'Pill')
    expect(pill).toEqual({
      name: 'Pill',
      import: '@fixture/ui/pill',
      docs: 'https://example.com/docs/components/pill/',
      status: 'beta',
      summary: "A small rounded label that's quiet",
      description: 'A small rounded label.',
      example: "<Pill label='New' />",
      props: [
        {
          name: 'tone',
          type: '"neutral" | "danger"',
          default: "'neutral'",
          description: 'Colour of the pill.'
        },
        {
          name: 'scale',
          type: 'number',
          description: 'Scales the pill.',
          deprecated: 'Use `size` instead, which follows the shape tiers.'
        },
        { name: 'label', type: 'string', required: true }
      ],
      parts: [
        {
          name: 'Pill.Icon',
          props: [
            {
              name: 'name',
              type: 'string',
              required: true,
              description: 'Phosphor icon name.'
            },
            {
              name: 'theme',
              type: '"dark" | "light"',
              description: 'Swatch the icon is drawn for.'
            }
          ]
        }
      ]
    })
  })

  it('lists only exported components', () => {
    const names = manifest.components.flatMap((c) => [
      c.name,
      ...(c.parts ?? []).map((part) => part.name)
    ])
    expect(names).toEqual(['Pill', 'Pill.Icon', 'Tag', 'Provider'])
  })

  it('describes components exported only from the package root', () => {
    expect(manifest.components.find((c) => c.name === 'Provider')).toEqual({
      name: 'Provider',
      import: '@fixture/ui',
      docs: 'https://example.com/docs/overview/setup/#providers',
      props: [
        {
          name: 'theme',
          type: '"light" | "dark"',
          description: 'Theme to start in.'
        }
      ]
    })
  })

  it('collects deprecated exports and props once per import path', () => {
    expect(manifest.deprecations).toEqual([
      { import: '@fixture/ui/pill', export: 'Tag', reason: 'Use `Pill`.' },
      {
        import: '@fixture/ui/pill',
        export: 'Pill',
        prop: 'scale',
        reason: 'Use `size` instead, which follows the shape tiers.'
      },
      {
        import: '@fixture/ui/pill',
        export: 'Tag',
        prop: 'scale',
        reason: 'Use `size` instead, which follows the shape tiers.'
      }
    ])
  })

  it('links a component documented elsewhere, by name or by import path', () => {
    expect(manifest.components.find((c) => c.name === 'Tag')).toMatchObject({
      import: '@fixture/ui/pill',
      docs: 'https://example.com/docs/components/pill/'
    })
  })

  it.each([
    [
      'a component has no docs page',
      { '@fixture/ui': { Provider: '/overview/setup/' } },
      'No docs page for @fixture/ui/pill Tag'
    ],
    [
      'a link names no component',
      {
        ...documentedElsewhere,
        '@fixture/ui': {
          Provider: '/overview/setup/',
          Gone: '/overview/setup/'
        }
      },
      '@fixture/ui Gone links no component'
    ],
    [
      'a link names a component with its own page',
      {
        ...documentedElsewhere,
        '@fixture/ui/pill': {
          Tag: '/components/pill/',
          Pill: '/overview/setup/'
        }
      },
      '@fixture/ui/pill Pill links no component'
    ],
    [
      'a link goes to a missing page',
      { ...documentedElsewhere, '@fixture/ui': { Provider: '/gone/' } },
      'No docs page at /gone/'
    ],
    [
      'a link goes to a missing heading',
      {
        ...documentedElsewhere,
        '@fixture/ui': { Provider: '/overview/setup/#gone' }
      },
      'No heading #gone on /overview/setup/'
    ],
    [
      'a link goes to a heading inside a code block',
      {
        ...documentedElsewhere,
        '@fixture/ui': { Provider: '/overview/setup/#not-a-heading' }
      },
      'No heading #not-a-heading on /overview/setup/'
    ],
    [
      'a link goes to a heading on a page.tsx',
      {
        ...documentedElsewhere,
        '@fixture/ui': { Provider: '/overview/hooks/#providers' }
      },
      "/overview/hooks/ is a page.tsx, whose headings can't be read"
    ]
  ])('fails when %s', (_, links, message) => {
    expect(() =>
      buildManifest({ ...options, documentedElsewhere: links })
    ).toThrow(message)
  })

  it.each(['#providers-1', '#using-hooks'])(
    'links the %s anchor rehype-slug gives the heading',
    (anchor) => {
      const { components } = buildManifest({
        ...options,
        documentedElsewhere: {
          ...documentedElsewhere,
          '@fixture/ui': { Provider: `/overview/setup/${anchor}` }
        }
      })
      expect(components.find((c) => c.name === 'Provider')?.docs).toBe(
        `https://example.com/docs/overview/setup/${anchor}`
      )
    }
  )

  it('describes components a .ts entry re-exports, and Vue skins as exports only', () => {
    const skins = buildManifest({
      ...options,
      packageDir: `${workspaceRoot}skins`
    })
    expect(skins.exports).toEqual([
      {
        subpath: './chip/core',
        import: '@fixture/skins/chip/core',
        kind: 'js',
        values: ['chipLabel', 'chipTone']
      },
      {
        subpath: './chip/react',
        import: '@fixture/skins/chip/react',
        kind: 'js',
        values: ['Chip', 'Tile'],
        types: ['ChipProps']
      },
      {
        subpath: './chip/vue',
        import: '@fixture/skins/chip/vue',
        kind: 'js',
        values: ['Chip']
      }
    ])
    expect(skins.components).toEqual([
      {
        name: 'Chip',
        import: '@fixture/skins/chip/react',
        docs: 'https://example.com/docs/components/chip/',
        summary: 'A removable filter chip',
        description: 'A removable filter chip.',
        props: [
          {
            name: 'label',
            type: 'string',
            required: true,
            description: 'Text on the chip.'
          }
        ]
      }
    ])
    expect(skins.deprecations).toEqual([
      {
        import: '@fixture/skins/chip/core',
        export: 'chipLabel',
        reason: 'Import from `@fixture/skins/chip/shared` instead.'
      },
      {
        import: '@fixture/skins/chip/react',
        export: 'Tile',
        reason: 'Renamed to `Chip`.'
      }
    ])
  })

  it('fails when a compound part has no docs', () => {
    expect(() =>
      buildManifest({ ...options, packageDir: `${workspaceRoot}cast` })
    ).toThrow('found no docs for Grid.Cell')
  })

  it('adds tokens only when given them', () => {
    expect(manifest).not.toHaveProperty('tokens')
    const tokens = [
      {
        name: '--radius-xl',
        kind: 'variable' as const,
        family: 'shape' as const,
        group: 'Radius',
        sheet: 'tokens.css',
        source: 'roadie' as const
      }
    ]
    expect(buildManifest({ ...options, tokens }).tokens).toEqual(tokens)
  })
})
