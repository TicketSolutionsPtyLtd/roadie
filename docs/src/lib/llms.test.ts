import { describe, expect, it } from 'vitest'

import { llmsIndex, pageToMarkdown, tokenFamilyToMarkdown } from './llms'

const page = (mdx: string) => pageToMarkdown({ title: 'Badge', mdx })

describe('pageToMarkdown', () => {
  it('opens with the title and the description as a summary', () => {
    const md = pageToMarkdown({
      title: 'Badge',
      description: 'A compact label',
      mdx: 'Body.'
    })
    expect(md).toBe('# Badge\n\n> A compact label\n\nBody.\n')
  })

  it('writes the title once when the page opens with its own H1', () => {
    expect(page('# Badge\n\nBody.')).toBe('# Badge\n\nBody.\n')
  })

  it('drops the metadata export, imports, and comments', () => {
    const md = page(
      [
        "export const metadata = { title: 'Badge' }",
        '',
        "import { PropsDefinitions } from '@/components/PropsDefinitions'",
        '',
        '{/* hidden note */}',
        '',
        'Visible prose.'
      ].join('\n')
    )
    expect(md).toBe('# Badge\n\nVisible prose.\n')
  })

  it('keeps live examples as plain tsx fences', () => {
    const md = page(
      '## Default\n\n```tsx-live id=default eager\n<Badge>New</Badge>\n```'
    )
    expect(md).toContain('## Default\n\n```tsx\n<Badge>New</Badge>\n```')
  })

  it('keeps live examples with fence options as plain tsx fences', () => {
    const md = page(
      [
        '```tsx-live-noinline-expand',
        'render(<A />)',
        '```',
        '',
        '```tsx-live-bleed-x',
        '<B />',
        '```'
      ].join('\n')
    )
    expect(md).toBe(
      '# Badge\n\n```tsx\nrender(<A />)\n```\n\n```tsx\n<B />\n```\n'
    )
  })

  it('keeps ordinary code fences, lists, and tables', () => {
    const mdx = [
      '```bash',
      'pnpm add @oztix/roadie-components',
      '```',
      '',
      '- One',
      '- Two',
      '',
      '| Prop | Use |',
      '| ---- | --- |',
      '| a    | b   |'
    ].join('\n')
    const md = page(mdx)
    expect(md).toContain('```bash\npnpm add @oztix/roadie-components\n```')
    expect(md).toContain('- One\n- Two')
    expect(md).toContain('| Prop | Use |')
  })

  it('keeps the prose inside JSX wrappers and drops empty elements', () => {
    const md = page(
      '<Callout>\n\nRead the **linking** page.\n\n</Callout>\n\n<Divider />'
    )
    expect(md).toBe('# Badge\n\nRead the **linking** page.\n')
  })

  it('writes a guideline as its title, Do or Don’t, example code, and advice', () => {
    const md = page(
      [
        "<Guideline title='Keep it short'>",
        '  <Guideline.Do',
        '    example={',
        "      <Badge intent='success'>Paid</Badge>",
        '    }',
        '  >',
        '    One word where one will do.',
        '  </Guideline.Do>',
        "  <Guideline.Dont code='<Badge>Payment has been received</Badge>'>",
        '    A sentence.',
        '  </Guideline.Dont>',
        '</Guideline>'
      ].join('\n')
    )
    expect(md).toBe(
      [
        '# Badge',
        '**Keep it short**',
        '**Do**',
        "```tsx\n<Badge intent='success'>Paid</Badge>\n```",
        'One word where one will do.',
        '**Don’t**',
        '```tsx\n<Badge>Payment has been received</Badge>\n```',
        'A sentence.\n'
      ].join('\n\n')
    )
  })

  it('writes guidelines in a Guidelines section without the docs layout around their examples', () => {
    const md = page(
      [
        '<Guidelines>',
        '',
        "<Guideline title='Pair a tile with a label'>",
        '  <Guideline.Do width={64} example={<Guideline.Row><IconTile /><p>Paid</p></Guideline.Row>}>',
        '    Name what the icon means.',
        '  </Guideline.Do>',
        '</Guideline>',
        '',
        '</Guidelines>'
      ].join('\n')
    )
    expect(md).toBe(
      [
        '# Badge',
        '**Pair a tile with a label**',
        '**Do**',
        '```tsx\n<><IconTile /><p>Paid</p></>\n```',
        'Name what the icon means.\n'
      ].join('\n\n')
    )
  })

  it('treats only Guideline and its parts as guidelines, not other names that start with it', () => {
    const md = page(
      [
        "<Guidelines title='Section'>",
        '',
        "<GuidelineIndex title='Index'>",
        '',
        'Body.',
        '',
        '</GuidelineIndex>',
        '',
        '</Guidelines>'
      ].join('\n')
    )
    expect(md).toBe('# Badge\n\nBody.\n')
  })

  it('drops a Guideline.Row written across lines', () => {
    const md = page(
      [
        "<Guideline title='Pair a tile with a label'>",
        '  <Guideline.Do',
        '    example={',
        '      <Guideline.Row>',
        '        <IconTile />',
        '        <p>Paid</p>',
        '      </Guideline.Row>',
        '    }',
        '  >',
        '    Name what the icon means.',
        '  </Guideline.Do>',
        '</Guideline>'
      ].join('\n')
    )
    expect(md).not.toContain('Guideline.Row')
    expect(md).toContain('<IconTile />')
  })

  it('writes a guideline’s template literal code as the code it evaluates to', () => {
    const md = page(
      [
        "<Guideline title='Keep the view in the URL'>",
        '  <Guideline.Do code={`router.replace(\\`?view=\\${id}\\`)`}>',
        '    Replace, don’t push.',
        '  </Guideline.Do>',
        '</Guideline>'
      ].join('\n')
    )
    expect(md).toContain('```tsx\nrouter.replace(`?view=${id}`)\n```')
  })

  it('keeps a guideline’s description under its title', () => {
    const md = page(
      [
        '<Guideline',
        "  title='Constrain the height'",
        '  description="ScrollArea never sizes itself."',
        '>',
        '  <Guideline.Do>',
        '    Set a max height.',
        '  </Guideline.Do>',
        '</Guideline>'
      ].join('\n')
    )
    expect(md).toBe(
      [
        '# Badge',
        '**Constrain the height**',
        'ScrollArea never sizes itself.',
        '**Do**',
        'Set a max height.\n'
      ].join('\n\n')
    )
  })

  it('writes inline <code> elements as inline code', () => {
    const md = page(
      '<Guideline.Do>\n  Use <code>subtler</code> in toolbars.\n</Guideline.Do>'
    )
    expect(md).toContain('Use `subtler` in toolbars.')
  })

  it('rewrites root-relative links and leaves external ones', () => {
    const md = pageToMarkdown({
      title: 'Badge',
      mdx: 'See [Field](/components/field#states) and [MDN](https://developer.mozilla.org).',
      resolveLink: (href) => `https://example.com/docs${href}`
    })
    expect(md).toContain(
      '[Field](https://example.com/docs/components/field#states)'
    )
    expect(md).toContain('[MDN](https://developer.mozilla.org)')
  })

  it('rewrites root-relative links in prop descriptions', () => {
    const md = pageToMarkdown({
      title: 'Card',
      mdx: "<PropsDefinitions component='x' />",
      components: [
        {
          name: 'Card',
          import: 'x/card',
          props: [
            {
              name: 'render',
              type: 'RoadieRenderProp',
              description: 'See [Linking](/foundations/linking).'
            }
          ]
        }
      ],
      resolveLink: (href) => `https://example.com${href}.md`
    })
    expect(md).toContain(
      '[Linking](https://example.com/foundations/linking.md)'
    )
  })

  it('replaces PropsDefinitions with an API reference from the manifest', () => {
    const md = pageToMarkdown({
      title: 'Select',
      mdx: "Intro.\n\n<PropsDefinitions component='Select' />\n\n## After",
      components: [
        {
          name: 'Select',
          import: '@oztix/roadie-components/select',
          description: 'Pick one option.',
          props: [
            {
              name: 'size',
              type: '"sm" | "md"',
              default: '"md"',
              description: 'Control height.'
            },
            { name: 'value', type: 'string', required: true },
            { name: 'old', type: 'boolean', deprecated: 'Use `value`.' }
          ],
          parts: [{ name: 'Select.Empty', props: [] }]
        }
      ]
    })
    expect(md).toBe(
      [
        '# Select',
        'Intro.',
        '## API reference',
        '### Select',
        'Pick one option.',
        "```tsx\nimport { Select } from '@oztix/roadie-components/select'\n```",
        [
          '- `size`: `"sm" | "md"`. Defaults to `"md"`. Control height.',
          '- `value`: `string`. Required.',
          '- `old`: `boolean`. Deprecated: Use `value`.'
        ].join('\n'),
        '### Select.Empty',
        'No props beyond the standard HTML attributes.',
        '## After\n'
      ].join('\n\n')
    )
  })

  it('writes the API reference once on a page with several PropsDefinitions', () => {
    const md = pageToMarkdown({
      title: 'Checkbox',
      mdx: "<PropsDefinitions component='A' />\n\n<PropsDefinitions component='B' />",
      components: [
        { name: 'Checkbox', import: 'x/checkbox', props: [] },
        { name: 'CheckboxGroup', import: 'x/checkbox-group', props: [] }
      ]
    })
    expect(md.match(/## API reference/g)).toHaveLength(1)
    expect(md).toContain('### Checkbox\n')
    expect(md).toContain('### CheckboxGroup\n')
  })

  it('ends the page with the API reference when it places no PropsDefinitions', () => {
    const md = pageToMarkdown({
      title: 'Chart patterns',
      mdx: 'Intro.',
      components: [{ name: 'ChartPatterns', import: 'x/chart', props: [] }]
    })
    expect(md).toBe(
      [
        '# Chart patterns',
        'Intro.',
        '## API reference',
        '### ChartPatterns',
        "```tsx\nimport { ChartPatterns } from 'x/chart'\n```",
        'No props beyond the standard HTML attributes.\n'
      ].join('\n\n')
    )
  })

  it('drops PropsDefinitions when the manifest has nothing for the page', () => {
    expect(page("<PropsDefinitions component='x' />\n\nEnd.")).toBe(
      '# Badge\n\nEnd.\n'
    )
  })
})

describe('llmsIndex', () => {
  it('writes the llmstxt.org shape and skips empty sections', () => {
    const txt = llmsIndex({
      title: 'Roadie',
      summary: 'Oztix’s design system.',
      details: 'Each link is a markdown page.',
      sections: [
        {
          name: 'Components',
          links: [
            {
              title: 'Badge',
              url: 'https://example.com/roadie/components/badge.md',
              description: 'A compact label'
            },
            {
              title: 'Card',
              url: 'https://example.com/roadie/components/card.md'
            }
          ]
        },
        { name: 'Empty', links: [] }
      ]
    })
    expect(txt).toBe(
      [
        '# Roadie',
        '> Oztix’s design system.',
        'Each link is a markdown page.',
        [
          '## Components',
          '- [Badge](https://example.com/roadie/components/badge.md): A compact label',
          '- [Card](https://example.com/roadie/components/card.md)'
        ].join('\n')
      ].join('\n\n') + '\n'
    )
  })
})

describe('tokenFamilyToMarkdown', () => {
  const page = {
    title: 'Intents',
    description: 'The intent classes.',
    intro: 'An `intent-*` class sets every role.',
    guidance: [
      { title: 'Colors', url: 'https://docs.test/foundations/colors.md' }
    ],
    tokens: [
      { name: 'intent-brand', group: 'Intent utilities' },
      {
        name: '--intent-bg-normal',
        group: 'Backgrounds',
        value: { light: 'var(--n-1)', dark: 'var(--n-2)' },
        byIntent: { brand: { light: 'var(--b-1)', dark: 'var(--b-2)' } }
      },
      {
        name: '--intent-bg-strong',
        group: 'Backgrounds',
        value: { light: 'var(--n-13)', dark: 'var(--n-13)' },
        byIntent: { brand: { light: 'var(--b-9)', dark: 'var(--b-9)' } },
        description: 'The | solid <fill>.'
      },
      {
        name: '--radius-lg',
        group: 'Radius',
        value: { light: '0.5rem' },
        classes: ['rounded-lg']
      }
    ]
  }

  it('writes the intro, the guidance, and a table per group with only the columns it uses', () => {
    expect(tokenFamilyToMarkdown(page)).toBe(
      [
        '# Intents',
        '> The intent classes.',
        'An `intent-*` class sets every role.',
        'When to use these: [Colors](https://docs.test/foundations/colors.md).',
        '## Intent utilities',
        '| Token |\n| --- |\n| `intent-brand` |',
        '## Backgrounds',
        [
          '| Token | Light | Dark, if different | Description |',
          '| --- | --- | --- | --- |',
          '| `--intent-bg-normal` | `var(--n-1)` | `var(--n-2)` |  |',
          '| `--intent-bg-strong` | `var(--n-13)` |  | The \\| solid &lt;fill>. |'
        ].join('\n'),
        'Where an intent sets its own value, light / dark:',
        [
          '| Token | brand |',
          '| --- | --- |',
          '| `--intent-bg-normal` | `var(--b-1)` / `var(--b-2)` |',
          '| `--intent-bg-strong` | `var(--b-9)` |'
        ].join('\n'),
        '## Radius',
        [
          '| Token | Value | Classes |',
          '| --- | --- | --- |',
          '| `--radius-lg` | `0.5rem` | `rounded-lg` |'
        ].join('\n')
      ].join('\n\n') + '\n'
    )
  })
})

describe('pageToMarkdown renderers', () => {
  it('replaces a registered docs component with its markdown, given its string props', () => {
    const md = pageToMarkdown({
      title: 'Charts',
      mdx: "Intro.\n\n<CatalogueIndex name='charts' searchable />\n\n## Setup\n\nAfter.",
      resolveLink: (href) => `https://docs.test${href}.md`,
      renderers: {
        CatalogueIndex: ({ name, searchable }) =>
          `## Layout (${name}, ${searchable})\n\n- [Chart](/charts/chart)`
      }
    })
    expect(md).toBe(
      [
        '# Charts',
        'Intro.',
        '## Layout (charts, true)',
        '- [Chart](https://docs.test/charts/chart.md)',
        '## Setup',
        'After.'
      ].join('\n\n') + '\n'
    )
  })
})

describe('pageToMarkdown renderer guards', () => {
  const renderers = { X: () => 'Rendered.' }
  it.each([
    ["Text <X name='inline' /> more.", /inside a paragraph/],
    ['<X name={other} />', /string or bare props/],
    ['<X {...rest} />', /string or bare props/]
  ])('throws for %s', (mdx, message) => {
    expect(() => pageToMarkdown({ title: 'T', mdx, renderers })).toThrow(
      message
    )
  })

  it('ignores a JSX name that is only an inherited object key', () => {
    expect(
      pageToMarkdown({ title: 'T', mdx: 'Hi <constructor />.', renderers })
    ).toBe('# T\n\nHi .\n')
  })
})

describe('pageToMarkdown description', () => {
  it('drops the description blockquote when the first paragraph repeats it', () => {
    expect(
      pageToMarkdown({
        title: 'Foundations',
        description: 'The principles every component builds on.',
        mdx: 'The principles every\ncomponent builds on.\n\nMore.'
      })
    ).toBe(
      '# Foundations\n\nThe principles every\ncomponent builds on.\n\nMore.\n'
    )
  })
})
