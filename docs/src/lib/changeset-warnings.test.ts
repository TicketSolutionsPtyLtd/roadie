import { describe, expect, it } from 'vitest'

import { changesetWarnings } from './changeset-warnings'
import type { PageIndex } from './releases'

const pages: PageIndex = new Map([
  ['Badge', { title: 'Badge', href: '/components/badge' }],
  ['Calendar', { title: 'Calendar', href: '/components/calendar' }],
  ['Toolbar', { title: 'Toolbar', href: '/components/toolbar' }]
])

const changeset = (
  text: string,
  bumps: Record<string, string> = { '@oztix/roadie-components': 'minor' }
) => ({
  file: '.changeset/example.md',
  source: `---\n${Object.entries(bumps)
    .map(([name, bump]) => `'${name}': ${bump}`)
    .join('\n')}\n---\n\n${text}\n`
})

const warn = (text: string, bumps?: Record<string, string>) =>
  changesetWarnings([changeset(text, bumps)], pages)

describe('changesetWarnings', () => {
  it.each([
    ['an article before the name', 'Add a `Calendar` component, a month grid.'],
    ['an article and "new"', 'Add a new `Calendar`, a month grid.'],
    [
      'a name with no page of its own beside it',
      'Add `Calendar` and `useCalendarState`, a month grid.'
    ]
  ])(
    'warns when a new component won’t become a highlight card: %s',
    (_, text) => {
      const warnings = warn(text)
      expect(warnings).toHaveLength(1)
      expect(warnings[0]).toMatchObject({ file: '.changeset/example.md' })
      expect(warnings[0]!.message).toContain('`Calendar`')
      expect(warnings[0]!.message).toContain('Add `Calendar`')
    }
  )

  it.each([
    ['a card', 'Add `Calendar`, a month grid for choosing a date.'],
    [
      'a card with an import path',
      'Add `Toolbar` (`@oztix/roadie-components/toolbar`), a row of controls.'
    ],
    ['a card for two', 'Add `Calendar` and `Toolbar`, two new parts.'],
    ['a new prop', 'Add `hideLabel` to `Badge`.'],
    ['a new prop with an article', 'Add a `size` prop to `Badge`.'],
    ['a new variant of a component', 'Add a new `Badge` variant, `tag`.'],
    ['a change led by a component', '`Badge` gains a `tag` variant.'],
    ['a name with no page', 'Add `isUnsafeHref` to `@oztix/roadie-core/utils`.']
  ])('stays quiet for %s', (_, text) => {
    expect(warn(text)).toEqual([])
  })

  it('stays quiet for a patch or an untracked package', () => {
    expect(
      warn('Add a `Calendar` component.', {
        '@oztix/roadie-components': 'patch'
      })
    ).toEqual([])
    expect(
      warn('Add a `Calendar` component.', { 'roadie-skills': 'minor' })
    ).toEqual([])
  })

  it('warns when a first release has no details to describe its card', () => {
    const warnings = warn('First release of `@oztix/roadie-eslint-plugin`.', {
      '@oztix/roadie-eslint-plugin': 'minor'
    })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]!.message).toMatch(/no details/)
  })

  it('warns when a first release has no page to open', () => {
    const warnings = warn(
      'First release of `@oztix/roadie-widgets`.\n\nThe cart drawer.',
      { '@oztix/roadie-widgets': 'minor' }
    )
    expect(warnings).toHaveLength(1)
    expect(warnings[0]!.message).toContain('PACKAGE_PAGES')
  })

  it('stays quiet for a first release with details and a page', () => {
    expect(
      warn(
        'First release of `@oztix/roadie-eslint-plugin` through the release workflow.\n\nESLint rules that catch Roadie mistakes.',
        { '@oztix/roadie-eslint-plugin': 'patch' }
      )
    ).toEqual([])
  })

  it('skips a file that isn’t a changeset', () => {
    expect(
      changesetWarnings(
        [{ file: '.changeset/notes.md', source: 'No frontmatter.' }],
        pages
      )
    ).toEqual([])
  })
})
