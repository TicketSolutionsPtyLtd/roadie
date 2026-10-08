import { fileURLToPath } from 'node:url'

import { buildManifest } from './manifest'

const workspaceRoot = fileURLToPath(
  new URL('./fixtures/workspace/', import.meta.url)
)
const options = {
  packageDir: `${workspaceRoot}pkg`,
  workspaceRoot,
  docsUrl: 'https://example.com/docs/'
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

  it('describes a component with its docs page, first live example and props', () => {
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
        { name: 'label', type: 'string', required: true },
        {
          name: 'scale',
          type: 'number',
          description: 'Scales the pill.',
          deprecated: 'Use `size` instead, which follows the shape tiers.'
        },
        {
          name: 'tone',
          type: '"neutral" | "danger"',
          default: "'neutral'",
          description: 'Colour of the pill.'
        }
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
