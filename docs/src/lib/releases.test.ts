import { describe, expect, it } from 'vitest'

import {
  type PageIndex,
  buildPageIndex,
  byKind,
  classify,
  groupReleases,
  linkPages,
  parseChangelog,
  parseChangeset,
  pendingChanges,
  releaseHistoryMarkdown,
  summarise,
  versionCommits
} from './releases'

const COMPONENTS_CHANGELOG = `# @oztix/roadie-components

## 2.15.0

### Minor Changes

- c95a44e: Add \`Avatar\`, a person's photo with initials. It falls back to
  an icon.

  \`Avatar.Group\` overlaps a row of avatars.

- 4aeab89: Add \`Callout\`, an inline message.

### Patch Changes

- b270fa6: Select options no longer stay filled after a tap.
- Updated dependencies [97854ae]
  - @oztix/roadie-core@2.10.0

## 2.14.0

### Major Changes

- dba660b: Remove \`LinkButton\`. Use \`Button\` with \`href\`.
`

const CORE_CHANGELOG = `# @oztix/roadie-core

## 2.10.0

### Minor Changes

- 4aeab89: Add \`Callout\`, an inline message.
`

const index: PageIndex = new Map([
  ['Avatar', { title: 'Avatar', href: '/components/avatar' }],
  ['Callout', { title: 'Callout', href: '/components/callout' }],
  ['Button', { title: 'Button', href: '/components/button' }],
  ['useRecords', { title: 'Records', href: '/foundations/records' }],
  [
    '@oztix/roadie-core/records',
    { title: 'Records', href: '/foundations/records' }
  ]
])

describe('parseChangelog', () => {
  it('reads each version with its entries and their bumps, skipping dependency bumps', () => {
    const [latest, previous] = parseChangelog(COMPONENTS_CHANGELOG)
    expect(latest?.version).toBe('2.15.0')
    expect(latest?.entries.map(({ id, bump }) => [id, bump])).toEqual([
      ['c95a44e', 'minor'],
      ['4aeab89', 'minor'],
      ['b270fa6', 'patch']
    ])
    expect(latest?.entries[0]?.text).toBe(
      "Add `Avatar`, a person's photo with initials. It falls back to\nan icon.\n\n`Avatar.Group` overlaps a row of avatars."
    )
    expect(previous?.entries).toEqual([
      {
        id: 'dba660b',
        bump: 'major',
        text: 'Remove `LinkButton`. Use `Button` with `href`.'
      }
    ])
  })
})

describe('parseChangeset', () => {
  it('reads the bump for each package and the entry', () => {
    expect(
      parseChangeset(
        'brand-intents',
        '---\n\'@oztix/roadie-core\': minor\n"@oztix/roadie-components": patch\n---\n\nAdd brand intents.\n'
      )
    ).toEqual({
      id: 'brand-intents',
      bumps: {
        '@oztix/roadie-core': 'minor',
        '@oztix/roadie-components': 'patch'
      },
      text: 'Add brand intents.'
    })
  })

  it('returns null for a file with no frontmatter', () => {
    expect(parseChangeset('readme', '# Changesets')).toBeNull()
  })
})

describe('summarise', () => {
  it.each([
    [
      'splits the first sentence from the rest',
      'Add `Callout`, an inline message. It has a title.\n\nIt has actions.',
      'Add `Callout`, an inline message.',
      'It has a title.\n\nIt has actions.'
    ],
    [
      'keeps a dotted name inside the first sentence',
      'Add `Avatar.Group` for rows. More.',
      'Add `Avatar.Group` for rows.',
      'More.'
    ],
    [
      'takes a paragraph with no full stop whole',
      'Add `Toggle` and `ToggleGroup`',
      'Add `Toggle` and `ToggleGroup`',
      ''
    ]
  ])('%s', (_, text, summary, details) => {
    expect(summarise(text)).toEqual({ summary, details })
  })
})

describe('classify', () => {
  it.each([
    ['Add `Avatar`, a photo.', 'minor', 'new'],
    ['Nine chart types for event insights.', 'minor', 'new'],
    ['`Card.Footer` now reads `--card-footer-size`.', 'minor', 'changed'],
    ['Rename `tone` to `intent`.', 'major', 'changed'],
    ['Remove `LinkButton`.', 'major', 'removed'],
    ['Drop the `size` prop.', 'minor', 'removed'],
    ['Deprecate `LinkButton` in favour of `Button`.', 'minor', 'deprecated'],
    ['`LinkButton` is deprecated.', 'patch', 'deprecated'],
    ['Select options no longer stay filled.', 'patch', 'fixed'],
    ['Fix the focus ring on `Tabs`.', 'patch', 'fixed'],
    ['Raise the `@base-ui/react` peer range.', 'patch', 'changed'],
    ['Add a `title` to `Kbd`.', 'patch', 'new'],
    ['`Remove` button labels read better.', 'patch', 'fixed']
  ] as const)('%s (%s) is %s', (summary, bump, kind) => {
    expect(classify(summary, bump)).toBe(kind)
  })
})

describe('linkPages', () => {
  it('links each page a change names once, in order, including JSX and import paths', () => {
    expect(
      linkPages(
        'Add `<Callout />` beside `Avatar.Group`, `Avatar`, `intent` and `@oztix/roadie-core/records`.',
        index
      )
    ).toEqual([
      { title: 'Callout', href: '/components/callout' },
      { title: 'Avatar', href: '/components/avatar' },
      { title: 'Records', href: '/foundations/records' }
    ])
  })

  it('stops at four pages', () => {
    const many: PageIndex = new Map(
      ['A', 'B', 'C', 'D', 'E'].map((name) => [
        name,
        { title: name, href: `/components/${name}` }
      ])
    )
    expect(linkPages('`A` `B` `C` `D` `E`', many)).toHaveLength(4)
  })
})

describe('versionCommits', () => {
  it('dates each version by the oldest commit that added its heading', () => {
    const log = [
      '\x1enew1111 2026-09-28 1790000000',
      '@@ -1,0 +3,2 @@',
      '+## 2.15.0',
      '+',
      '\x1eold2222 2026-09-24 1789000000',
      '+## 2.14.0',
      '\x1eolder333 2026-09-20 1788000000',
      '+## 2.14.0'
    ].join('\n')
    expect(Object.fromEntries(versionCommits(log))).toEqual({
      '2.15.0': { hash: 'new1111', date: '2026-09-28', time: 1790000000 },
      '2.14.0': { hash: 'older333', date: '2026-09-20', time: 1788000000 }
    })
  })
})

describe('groupReleases', () => {
  const commits = (
    entries: [string, string, string, number][]
  ): Map<string, { hash: string; date: string; time: number }> =>
    new Map(
      entries.map(([version, hash, date, time]) => [
        version,
        { hash, date, time }
      ])
    )

  it('groups the versions one commit added into a release, newest first, with one entry per changeset', () => {
    const [latest, previous] = groupReleases(
      [
        {
          name: '@oztix/roadie-components',
          versions: parseChangelog(COMPONENTS_CHANGELOG),
          commits: commits([
            ['2.15.0', 'aaa', '2026-09-28', 20],
            ['2.14.0', 'bbb', '2026-09-24', 10]
          ])
        },
        {
          name: '@oztix/roadie-core',
          versions: parseChangelog(CORE_CHANGELOG),
          commits: commits([['2.10.0', 'aaa', '2026-09-28', 20]])
        }
      ],
      index
    )
    expect(latest?.id).toBe('release-2026-09-28')
    expect(latest?.date).toBe('2026-09-28')
    expect(
      latest?.packages.map(({ label, version }) => `${label} ${version}`)
    ).toEqual(['Components 2.15.0', 'Core 2.10.0'])
    expect(latest?.packages[0]?.href).toBe(
      'https://github.com/TicketSolutionsPtyLtd/roadie/blob/main/packages/components/CHANGELOG.md#2150'
    )
    const callout = latest?.changes.find((change) => change.id === '4aeab89')
    expect(callout?.packages).toEqual([
      '@oztix/roadie-components',
      '@oztix/roadie-core'
    ])
    expect(latest?.changes).toHaveLength(3)
    expect(
      byKind(latest?.changes ?? []).map(({ title, changes }) => [
        title,
        changes.map((change) => change.summary)
      ])
    ).toEqual([
      [
        'New',
        [
          "Add `Avatar`, a person's photo with initials.",
          'Add `Callout`, an inline message.'
        ]
      ],
      ['Fixed', ['Select options no longer stay filled after a tap.']]
    ])
    expect(latest?.changes[0]?.pages).toEqual([
      { title: 'Avatar', href: '/components/avatar' }
    ])
    expect(previous?.changes[0]).toMatchObject({
      kind: 'removed',
      breaking: true,
      details: 'Use `Button` with `href`.'
    })
  })

  it('leaves a version undated, as its own release, when there is no history', () => {
    const releases = groupReleases(
      [
        {
          name: '@oztix/roadie-core',
          versions: parseChangelog(CORE_CHANGELOG),
          commits: new Map()
        }
      ],
      index
    )
    expect(
      releases.map(({ date, packages }) => [date, packages.length])
    ).toEqual([[null, 1]])
  })
})

describe('pendingChanges', () => {
  it('lists pending changes for followed packages, with the largest bump per package', () => {
    const pending = pendingChanges(
      [
        {
          id: 'records',
          bumps: {
            '@oztix/roadie-core': 'minor',
            '@oztix/roadie-components': 'patch'
          },
          text: 'Add `useRecords`. It reads a view.'
        },
        {
          id: 'fix',
          bumps: { '@oztix/roadie-components': 'patch' },
          text: 'Buttons now follow their parent.'
        },
        {
          id: 'skill',
          bumps: { 'roadie-skills': 'minor' },
          text: 'Adds a skill.'
        }
      ],
      index
    )
    expect(pending.packages).toEqual([
      { name: '@oztix/roadie-components', label: 'Components', bump: 'patch' },
      { name: '@oztix/roadie-core', label: 'Core', bump: 'minor' }
    ])
    expect(
      pending.changes.map(({ id, kind, pages }) => [id, kind, pages.length])
    ).toEqual([
      ['records', 'new', 1],
      ['fix', 'fixed', 0]
    ])
  })
})

describe('buildPageIndex', () => {
  const titles: Record<string, string> = {
    '/components/avatar': 'Avatar',
    '/foundations/records': 'Records',
    '/components/field': 'Field'
  }
  const built = buildPageIndex(
    [
      {
        components: [
          {
            name: 'Avatar',
            import: '@oztix/roadie-components/avatar',
            docs: 'https://ticketsolutionsptyltd.github.io/roadie/components/avatar/'
          },
          {
            name: 'RequiredIndicator',
            import: '@oztix/roadie-components/field',
            docs: 'https://ticketsolutionsptyltd.github.io/roadie/components/field/#with-indicators'
          },
          {
            name: 'Ghost',
            import: '@oztix/roadie-components/ghost',
            docs: 'https://ticketsolutionsptyltd.github.io/roadie/components/ghost/'
          }
        ],
        exports: [
          {
            subpath: './avatar',
            import: '@oztix/roadie-components/avatar',
            values: ['Avatar', 'getInitials']
          }
        ]
      },
      {
        exports: [
          {
            subpath: './records',
            import: '@oztix/roadie-core/records',
            values: ['createRecordsQuery']
          },
          {
            subpath: './theme',
            import: '@oztix/roadie-core/theme',
            values: ['getThemeScript']
          }
        ]
      }
    ],
    (route) => titles[route]
  )

  it.each([
    ['Avatar', '/components/avatar', 'Avatar'],
    ['getInitials', '/components/avatar', 'Avatar'],
    ['RequiredIndicator', '/components/field#with-indicators', 'Field'],
    ['@oztix/roadie-core/records', '/foundations/records', 'Records'],
    ['createRecordsQuery', '/foundations/records', 'Records']
  ])('links %s to %s', (key, href, title) => {
    expect(built.get(key)).toEqual({ title, href })
  })

  it.each(['Ghost', 'getThemeScript'])(
    'leaves %s out when its page does not exist',
    (key) => {
      expect(built.has(key)).toBe(false)
    }
  )
})

describe('releaseHistoryMarkdown', () => {
  it('writes unreleased changes, then each release under its date, grouped by kind with page links', () => {
    const releases = groupReleases(
      [
        {
          name: '@oztix/roadie-components',
          versions: parseChangelog(COMPONENTS_CHANGELOG).slice(1),
          commits: new Map([
            ['2.14.0', { hash: 'bbb', date: '2026-09-24', time: 10 }]
          ])
        }
      ],
      index
    )
    const unreleased = pendingChanges(
      [
        {
          id: 'avatar',
          bumps: { '@oztix/roadie-components': 'minor' },
          text: 'Add `Avatar`. It shows initials.'
        }
      ],
      index
    )
    expect(
      releaseHistoryMarkdown(
        { unreleased, releases },
        (href) => `https://docs.test${href}.md`,
        (date) => `day ${date}`
      )
    ).toBe(
      [
        '## Unreleased',
        'Not on npm yet. Goes to `@oztix/roadie-components` (minor).',
        '### New',
        '- Add `Avatar`.\n\n  See [Avatar](https://docs.test/components/avatar.md).\n\n  It shows initials.',
        '## day 2026-09-24',
        '[`@oztix/roadie-components@2.14.0`](https://github.com/TicketSolutionsPtyLtd/roadie/blob/main/packages/components/CHANGELOG.md#2140)',
        '### Removed',
        '- **Breaking.** Remove `LinkButton`.\n\n  See [Button](https://docs.test/components/button.md).\n\n  Use `Button` with `href`.'
      ].join('\n\n')
    )
  })
})

describe('groupReleases on one day', () => {
  it('makes one release of every version added that day, even two of one package', () => {
    const versions = parseChangelog(
      '## 3.1.0\n\n### Minor Changes\n\n- aaa1111: Add `Avatar`.\n\n## 3.0.0\n\n### Major Changes\n\n- bbb2222: Remove `LinkButton`.\n'
    )
    const releases = groupReleases(
      [
        {
          name: '@oztix/roadie-widgets',
          versions,
          commits: new Map([
            ['3.1.0', { hash: 'c2', date: '2026-06-18', time: 20 }],
            ['3.0.0', { hash: 'c1', date: '2026-06-18', time: 10 }]
          ])
        }
      ],
      index
    )
    expect(releases).toHaveLength(1)
    expect(releases[0]?.packages.map(({ version }) => version)).toEqual([
      '3.1.0',
      '3.0.0'
    ])
    expect(releases[0]?.changes.map(({ kind }) => kind)).toEqual([
      'new',
      'removed'
    ])
  })
})
