import { describe, expect, it } from 'vitest'

import {
  type Change,
  type PageIndex,
  type ReleaseCard,
  type ReleaseItem,
  addedPages,
  applyNote,
  buildPageIndex,
  byKind,
  cardOf,
  classify,
  groupReleases,
  linkPages,
  pageCreatedDates,
  pageRelease,
  pageSubpaths,
  parseChangelog,
  parseChangeset,
  parseReleaseNote,
  pendingChanges,
  releaseHistoryMarkdown,
  releaseSummary,
  releaseTitle,
  statusSentence,
  subpathTimes,
  summarise,
  toInline,
  toReleaseView,
  versionCommits,
  views
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
    ['Upgrade to PandaCSS 1.4.3.', 'major', 'changed'],
    ['Migrate the build from tsup to tsdown.', 'patch', 'changed'],
    ['Refine the shadow scale.', 'minor', 'changed'],
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
      // 2026-09-27 23:50 UTC, and 09:50 the next day in Sydney.
      '\x1enew1111 1790553034',
      '@@ -1,0 +3,2 @@',
      '+## 2.15.0',
      '+',
      '\x1eold2222 1789000000',
      '+## 2.14.0',
      '\x1eolder333 1788000000',
      '+## 2.14.0'
    ].join('\n')
    expect(Object.fromEntries(versionCommits(log))).toEqual({
      '2.15.0': { hash: 'new1111', date: '2026-09-27', time: 1790553034 },
      '2.14.0': { hash: 'older333', date: '2026-08-29', time: 1788000000 }
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
    expect(latest?.id).toBe('components-2-15-0')
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

  it('keeps changesets one commit added apart, since they share its hash', () => {
    const [release] = groupReleases(
      [
        {
          name: '@oztix/roadie-components',
          versions: parseChangelog(`## 2.14.0

### Minor Changes

- dba660b: Add \`Card.Link\`.
- dba660b: Add \`emphasis\` to \`Drawer\`.
`),
          commits: commits([['2.14.0', 'aaa', '2026-09-24', 10]])
        },
        {
          name: '@oztix/roadie-core',
          versions: parseChangelog(`## 2.9.0

### Minor Changes

- dba660b: Add \`emphasis\` to \`Drawer\`.
`),
          commits: commits([['2.9.0', 'aaa', '2026-09-24', 10]])
        }
      ],
      index
    )
    expect(
      release?.changes.map(({ id, summary, packages }) => [
        id,
        summary,
        packages.length
      ])
    ).toEqual([
      ['dba660b', 'Add `Card.Link`.', 1],
      ['dba660b-2', 'Add `emphasis` to `Drawer`.', 2]
    ])
  })

  it('leaves a version undated, as its own release, newest first across packages, when there is no history', () => {
    const releases = groupReleases(
      [
        {
          name: '@oztix/roadie-components',
          versions: parseChangelog(COMPONENTS_CHANGELOG),
          commits: new Map()
        },
        {
          name: '@oztix/roadie-core',
          versions: parseChangelog(CORE_CHANGELOG),
          commits: new Map()
        }
      ],
      index
    )
    expect(
      releases.map(({ id, date, packages }) => [id, date, packages.length])
    ).toEqual([
      ['components-2-15-0', null, 1],
      ['core-2-10-0', null, 1],
      ['components-2-14-0', null, 1]
    ])
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
            name: 'OptionalIndicator',
            import: '@oztix/roadie-components',
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
            subpath: '.',
            import: '@oztix/roadie-components',
            values: ['OptionalIndicator', 'buttonVariants']
          },
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

  it.each([
    'Ghost',
    'getThemeScript',
    '@oztix/roadie-components',
    'buttonVariants'
  ])(
    'leaves %s out when its page does not exist or it is the root barrel',
    (key) => {
      expect(built.has(key)).toBe(false)
    }
  )
})

describe('releaseHistoryMarkdown', () => {
  it('writes each release with its headline, versions, highlights, and every change in full', () => {
    const history = {
      releases: groupReleases(
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
      ),
      unreleased: pendingChanges(
        [
          {
            id: 'avatar',
            bumps: { '@oztix/roadie-components': 'minor' },
            text: 'Add `Avatar`, a photo. It shows initials.'
          }
        ],
        index
      )
    }
    const releases = views(history, {
      index,
      pageInfo: () => undefined,
      notes: new Map()
    })
    expect(
      releaseHistoryMarkdown(history, releases, {
        resolve: (href) => `https://docs.test${href}.md`,
        formatDate: (date) => `day ${date}`
      })
    ).toBe(
      [
        '## Avatar',
        'Not on npm yet. Goes to Components.',
        '1 addition.',
        '[This release on its own page](https://docs.test/overview/changelog/unreleased.md)',
        '### Highlights',
        '- **Avatar**: A photo. See [Avatar](https://docs.test/components/avatar.md).',
        '### New',
        '- Add `Avatar`, a photo.\n\n  See [Avatar](https://docs.test/components/avatar.md).\n\n  It shows initials.',
        '## Button',
        'Released day 2026-09-24. [Components 2.14.0](https://github.com/TicketSolutionsPtyLtd/roadie/blob/main/packages/components/CHANGELOG.md#2140)',
        '1 breaking change.',
        '[This release on its own page](https://docs.test/overview/changelog/components-2-14-0.md)',
        '### Highlights',
        '- **Button** (breaking): Remove `LinkButton`. See [Button](https://docs.test/components/button.md).',
        '### Removed',
        '- **Breaking.** Remove `LinkButton`.\n\n  See [Button](https://docs.test/components/button.md).\n\n  Use `Button` with `href`.'
      ].join('\n\n')
    )
  })
})

describe('groupReleases on one day', () => {
  it('keeps versions that separate commits added on one day as separate releases', () => {
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
    expect(
      releases.map(({ id, date, changes }) => [
        id,
        date,
        changes.map(({ kind }) => kind)
      ])
    ).toEqual([
      ['widgets-3-1-0', '2026-06-18', ['new']],
      ['widgets-3-0-0', '2026-06-18', ['removed']]
    ])
  })
})

describe('groupReleases across packages', () => {
  it('classifies a changeset by its largest bump across the packages it versions', () => {
    const commits = new Map([
      ['1.0.0', { hash: 'c', date: '2026-09-28', time: 1 }]
    ])
    const [release] = groupReleases(
      [
        {
          name: '@oztix/roadie-components',
          versions: parseChangelog(
            '## 1.0.0\n\n### Patch Changes\n\n- abc1234: `Card` sizes its footer.\n'
          ),
          commits
        },
        {
          name: '@oztix/roadie-core',
          versions: parseChangelog(
            '## 1.0.0\n\n### Minor Changes\n\n- abc1234: `Card` sizes its footer.\n'
          ),
          commits
        }
      ],
      index
    )
    expect(release?.changes.map(({ kind }) => kind)).toEqual(['new'])
  })
})

describe('breaking changes', () => {
  it.each([
    ['major', 'Rename `tone` to `intent`.', true],
    ['minor', '**Breaking:** `RecordTable` takes `view`, not `query`.', true],
    ['minor', 'Add `Avatar`.\n\nA breaking note further down.', false],
    ['minor', 'Breaking: `List.Item` takes `href` only.', true],
    ['minor', 'Add `status`. Beta marks a breaking change as Breaking.', false],
    ['patch', 'Zero breaking change: `.Root` is an alias.', false],
    ['minor', 'Add `Avatar`.', false]
  ] as const)(
    'a %s change reading "%s" is breaking: %s',
    (bump, text, breaking) => {
      expect(
        pendingChanges(
          [{ id: 'x', bumps: { '@oztix/roadie-components': bump }, text }],
          index
        ).changes[0]?.breaking
      ).toBe(breaking)
    }
  )
})

describe('pageRelease', () => {
  const history = {
    releases: groupReleases(
      [
        {
          name: '@oztix/roadie-components',
          versions: parseChangelog(
            [
              '## 2.15.0',
              '### Minor Changes',
              '- a1: `Avatar` now takes `shape`.',
              '## 2.14.0',
              '### Minor Changes',
              '- b2: Add `Callout`.',
              '## 2.13.0',
              '### Minor Changes',
              '- c3: Add `Avatar`.'
            ].join('\n\n')
          ),
          commits: new Map([
            ['2.15.0', { hash: 'x', date: '2026-09-28', time: 30 }],
            ['2.14.0', { hash: 'y', date: '2026-09-24', time: 20 }],
            ['2.13.0', { hash: 'z', date: '2026-09-22', time: 10 }]
          ])
        }
      ],
      index
    ),
    unreleased: pendingChanges(
      [
        {
          id: 'callout',
          bumps: { '@oztix/roadie-components': 'patch' },
          text: '`Callout` wraps long titles.'
        }
      ],
      index
    )
  }
  const components = { packageName: '@oztix/roadie-components' }

  it('adds a page in the first release that names it, and updates it in the newest', () => {
    expect(pageRelease('/components/avatar', history, components)).toEqual({
      added: {
        label: 'Components',
        version: '2.13.0',
        date: '2026-09-22',
        id: 'components-2-13-0'
      },
      updated: {
        label: 'Components',
        version: '2.15.0',
        date: '2026-09-28',
        id: 'components-2-15-0'
      },
      upcoming: false
    })
  })

  it('takes the first release of its package after the page was created when that is earlier', () => {
    const { added } = pageRelease('/components/avatar', history, {
      ...components,
      created: '2026-09-23'
    })
    expect(added).toMatchObject({ version: '2.13.0' })
    const { added: fromDate } = pageRelease('/components/button', history, {
      ...components,
      created: '2026-09-23'
    })
    expect(fromDate).toMatchObject({ version: '2.14.0' })
  })

  it('leaves out updated when it is the release that added the page, and flags a pending change', () => {
    expect(pageRelease('/components/callout', history, components)).toEqual({
      added: expect.objectContaining({ version: '2.14.0' }),
      updated: null,
      upcoming: true
    })
  })

  it('takes the first release of its package after its import path appeared, over any mention', () => {
    expect(
      pageRelease('/components/avatar', history, { ...components, shipped: 15 })
        .added
    ).toMatchObject({ version: '2.14.0' })
    expect(
      pageRelease('/components/avatar', history, { ...components, shipped: 31 })
        .added
    ).toBe('unreleased')
  })

  it('says unreleased for a page created after the last release, and nothing without history', () => {
    expect(
      pageRelease('/components/button', history, {
        ...components,
        created: '2026-10-01'
      }).added
    ).toBe('unreleased')
    expect(pageRelease('/components/button', history, components)).toEqual({
      added: null,
      updated: null,
      upcoming: false
    })
  })
})

describe('pageCreatedDates', () => {
  it('dates each page route by the oldest commit that added its page file', () => {
    const log = [
      // 2026-09-30 23:50 UTC, and 09:50 the next day in Sydney.
      '\x1e1790812234',
      '',
      'docs/src/app/components/kbd/page.mdx',
      'docs/src/app/components/kbd/notes.ts',
      '\x1e1775606400',
      '',
      'docs/src/app/components/button/page.mdx',
      '\x1e1735862400',
      '',
      'docs/src/app/components/button/page.tsx',
      'docs/src/app/page.tsx'
    ].join('\n')
    expect(Object.fromEntries(pageCreatedDates(log))).toEqual({
      '/components/kbd': '2026-09-30',
      '/components/button': '2025-01-03',
      '/': '2025-01-03'
    })
  })
})

describe('pageSubpaths', () => {
  it('gives each docs route the package and import path of the first component it documents', () => {
    expect(
      Object.fromEntries(
        pageSubpaths([
          {
            package: '@oztix/roadie-components',
            components: [
              {
                name: 'StatTile',
                import: '@oztix/roadie-components/stat-tile',
                docs: 'https://ticketsolutionsptyltd.github.io/roadie/charts/stat-tile/'
              },
              {
                name: 'RequiredIndicator',
                import: '@oztix/roadie-components/field',
                docs: 'https://ticketsolutionsptyltd.github.io/roadie/components/field/#with-indicators'
              }
            ]
          },
          {
            package: '@oztix/roadie-charts',
            components: [
              {
                name: 'StatTileChart',
                import: '@oztix/roadie-charts/x',
                docs: 'https://ticketsolutionsptyltd.github.io/roadie/charts/stat-tile/'
              }
            ]
          }
        ])
      )
    ).toEqual({
      '/charts/stat-tile': {
        packageName: '@oztix/roadie-components',
        importPath: '@oztix/roadie-components/stat-tile'
      },
      '/components/field': {
        packageName: '@oztix/roadie-components',
        importPath: '@oztix/roadie-components/field'
      }
    })
  })
})

describe('subpathTimes', () => {
  it('times each import path by the oldest commit that exported it or added its component folder', () => {
    const exportsLog = [
      '\x1e300',
      '+++ b/packages/widgets/package.json',
      '+    "./cart-contents/react": {',
      '+++ b/packages/core/package.json',
      '+    "./records": "./dist/records.js",',
      '\x1e100',
      '+++ b/packages/widgets/package.json',
      '+    "./cart-contents/react": {',
      '+    "./*": "./dist/*.js"'
    ].join('\n')
    const foldersLog = [
      '\x1e200',
      '',
      'packages/components/src/components/OTPField/index.tsx',
      'packages/components/src/components/OTPField/OTPField.test.tsx'
    ].join('\n')
    expect(Object.fromEntries(subpathTimes(exportsLog, foldersLog))).toEqual({
      '@oztix/roadie-widgets/cart-contents/react': 100,
      '@oztix/roadie-core/records': 300,
      '@oztix/roadie-components/otp-field': 200
    })
  })
})

describe('statusSentence', () => {
  const ref = (version: string, date: string) => ({
    label: 'Components',
    version,
    date,
    id: `release-${date}`
  })
  it.each([
    [
      'stable',
      {
        added: ref('0.1.0', '2025-01-03'),
        updated: ref('2.13.0', '2026-09-22'),
        upcoming: true
      },
      'Status: stable. Added in Components 0.1.0. Updated in Components 2.13.0, day 2026-09-22. More changes are in the next release.'
    ],
    [
      'alpha',
      { added: 'unreleased' as const, updated: null, upcoming: true },
      'Status: alpha. Not released yet.'
    ],
    ['beta', { added: null, updated: null, upcoming: false }, 'Status: beta.']
  ])('writes %s', (status, release, sentence) => {
    expect(statusSentence(status, release, (date) => `day ${date}`)).toBe(
      sentence
    )
  })
})

const pages: PageIndex = new Map([
  ['DateField', { title: 'Date field', href: '/components/date-field' }],
  ['TimeField', { title: 'Time field', href: '/components/time-field' }],
  ['OTPField', { title: 'OTP field', href: '/components/otp-field' }],
  ['Badge', { title: 'Badge', href: '/components/badge' }],
  ['Card', { title: 'Card', href: '/components/card' }],
  [
    '@oztix/roadie-components/date-field',
    { title: 'Date field', href: '/components/date-field' }
  ]
])

const change = (summary: string, overrides: Partial<Change> = {}): Change => ({
  id: summary.slice(0, 8),
  kind: 'new',
  breaking: false,
  packages: ['@oztix/roadie-components'],
  summary,
  details: '',
  pages: [],
  ...overrides
})

describe('addedPages', () => {
  it('reads the components a change adds, past their import paths, and what it says of them', () => {
    expect(
      addedPages(
        'Add `DateField` (`@oztix/roadie-components/date-field`) and `TimeField`, typed date and time fields.',
        pages
      )
    ).toEqual({
      pages: [
        { title: 'Date field', href: '/components/date-field' },
        { title: 'Time field', href: '/components/time-field' }
      ],
      rest: ', typed date and time fields.'
    })
  })

  it.each([
    ['a prop', 'Add `hideLabel` to `Badge`.'],
    ['a part', 'Add `Card.Link`, the card’s main link.'],
    ['no opening name', 'Add the dashboard components: `Card`.'],
    ['no verb that adds', '`Badge` now wraps.']
  ])('finds no new component in %s', (_, summary) => {
    expect(addedPages(summary, pages)).toBeNull()
  })
})

describe('cardOf', () => {
  const pageInfo = (route: string) =>
    route === '/components/otp-field'
      ? { title: 'OTP field', description: 'One slot per character.' }
      : undefined

  it('cards a new component under its page title, described by what the change says of it', () => {
    expect(
      cardOf(change('Add `DateField`, a typed date field.'), pages, pageInfo)
    ).toMatchObject({
      title: 'Date field',
      description: ['A typed date field.'],
      href: '/components/date-field',
      art: '/components/date-field',
      breaking: false,
      packages: ['components']
    })
  })

  it('falls back to the page description when the change says nothing more', () => {
    expect(
      cardOf(change('Add `OTPField`.'), pages, pageInfo)?.description
    ).toEqual(['One slot per character.'])
  })

  it('cards a breaking change under its bold subject, or its page', () => {
    expect(
      cardOf(
        change('**Peer dependency change: React 19.2 is required.**', {
          kind: 'changed',
          breaking: true
        }),
        pages,
        pageInfo
      )
    ).toMatchObject({
      title: 'Peer dependency change',
      description: ['React 19.2 is required.'],
      breaking: true
    })
    expect(
      cardOf(
        change('**Breaking:** `Card` drops `as`.', {
          kind: 'changed',
          breaking: true,
          pages: [{ title: 'Card', href: '/components/card' }]
        }),
        pages,
        pageInfo
      )
    ).toMatchObject({
      title: 'Card',
      description: [{ code: 'Card' }, ' drops ', { code: 'as' }, '.']
    })
  })

  it('lists a fix or a smaller addition rather than carding it', () => {
    expect(
      cardOf(change('Add `hideLabel` to `Badge`.'), pages, pageInfo)
    ).toBeNull()
    expect(
      cardOf(change('`Badge` wraps.', { kind: 'fixed' }), pages, pageInfo)
    ).toBeNull()
  })
})

const card = (
  name: string,
  overrides: Partial<ReleaseCard> = {}
): ReleaseCard => ({
  id: name,
  title: name,
  name,
  description: [],
  breaking: false,
  packages: ['components'],
  ...overrides
})

const item = (
  kind: ReleaseItem['kind'],
  page?: string,
  text = 'A change.'
): ReleaseItem => ({
  id: `${kind}-${page}-${text}`,
  kind,
  text: [text],
  page: page ? { title: page, href: `/components/${page}` } : undefined,
  packages: ['components']
})

describe('releaseTitle', () => {
  it('names the first highlights, then the pages the rest touch most, and says when there is more', () => {
    expect(
      releaseTitle(
        [card('QR code')],
        [item('fixed', 'Drawer'), item('new', 'Card'), item('new', 'Card')]
      )
    ).toBe('QR code, Card, and Drawer')
    expect(
      releaseTitle(
        [card('Avatar'), card('Callout'), card('Menu'), card('Toast')],
        []
      )
    ).toBe('Avatar, Callout, Menu, and more')
  })

  it('names the pages a release without highlights updates', () => {
    expect(releaseTitle([], [item('fixed', 'Select')])).toBe(
      'Updates to Select'
    )
  })

  it('takes a lone change’s opening words when it names no page', () => {
    expect(
      releaseTitle(
        [],
        [item('new', undefined, 'Add a date standard: four parts.')]
      )
    ).toBe('Add a date standard')
  })
})

describe('releaseSummary', () => {
  it('counts each kind once, breaking changes first', () => {
    expect(
      releaseSummary(
        [card('Avatar'), card('Card', { breaking: true })],
        [item('fixed'), item('fixed'), item('changed')]
      )
    ).toBe('1 breaking change, 1 addition, 1 change, and 2 fixes.')
  })
})

describe('parseReleaseNote', () => {
  it('reads a title, a summary, and highlights', () => {
    expect(
      parseReleaseNote(
        'note.md',
        '---\ntitle: Charts\nsummary: Nine chart types.\nhighlights:\n  - Avatar\n  - title: Charts\n    href: /charts/line-chart\n    packages: [charts]\n---\n'
      )
    ).toEqual({
      title: 'Charts',
      summary: 'Nine chart types.',
      highlights: [
        'Avatar',
        { title: 'Charts', href: '/charts/line-chart', packages: ['charts'] }
      ]
    })
  })

  it.each([
    ['a misspelt field', '---\ntitel: Charts\n---\n', 'unknown field "titel"'],
    [
      'a card with no title',
      '---\nhighlights:\n  - href: /charts\n---\n',
      'a highlight card has no title'
    ],
    [
      'an unknown package',
      '---\nhighlights:\n  - title: Charts\n    packages: [chart]\n---\n',
      "names a package that isn't one of"
    ]
  ])('fails the build on %s', (_, source, message) => {
    expect(() => parseReleaseNote('note.md', source)).toThrow(message)
  })
})

describe('applyNote', () => {
  it('puts the cards a note lists first, in its order, adding its own and keeping the rest', () => {
    const cards = applyNote(
      [
        card('Avatar'),
        card('Menu'),
        card('Toast', { href: '/components/toast' })
      ],
      {
        highlights: [
          {
            title: 'Charts',
            href: '/charts/line-chart',
            description: 'Nine `Chart` types.'
          },
          'Toast',
          { title: 'Menu', description: 'Actions.' }
        ]
      },
      ['components', 'charts']
    )
    expect(
      cards.map(({ title, description, href, art, packages }) => ({
        title,
        description,
        href,
        art,
        packages
      }))
    ).toEqual([
      {
        title: 'Charts',
        description: ['Nine ', { code: 'Chart' }, ' types.'],
        href: '/charts/line-chart',
        art: '/charts/line-chart',
        packages: ['components', 'charts']
      },
      {
        title: 'Toast',
        description: [],
        href: '/components/toast',
        art: undefined,
        packages: ['components']
      },
      {
        title: 'Menu',
        description: ['Actions.'],
        href: undefined,
        art: undefined,
        packages: ['components']
      },
      {
        title: 'Avatar',
        description: [],
        href: undefined,
        art: undefined,
        packages: ['components']
      }
    ])
  })

  it('fails the build when a note lists a highlight the release lacks', () => {
    expect(() =>
      applyNote(
        [card('Avatar')],
        { highlights: ['Avtar'] },
        ['components'],
        'x.md'
      )
    ).toThrow(
      'x.md lists "Avtar", which is not one of this release\'s highlights: Avatar.'
    )
  })
})

describe('toReleaseView', () => {
  it('uses a note’s headline for the whole release, and automatic ones for each package', () => {
    const view = toReleaseView(
      {
        slug: 'components-2-15-0',
        date: '2026-09-28',
        pending: false,
        versions: [
          { package: 'components', label: 'Components', version: '2.15.0' },
          { package: 'core', label: 'Core', version: '2.10.0' }
        ],
        changes: [
          change('Add `DateField`, a typed date field.'),
          change('`cn()` merges intents.', {
            kind: 'fixed',
            packages: ['@oztix/roadie-core']
          })
        ]
      },
      {
        index: pages,
        pageInfo: () => undefined,
        note: { title: 'Dates', summary: 'Typed dates.' }
      }
    )
    expect(view.headlines).toEqual({
      all: { title: 'Dates', summary: 'Typed dates.' },
      components: { title: 'Date field', summary: '1 addition.' },
      core: { title: 'Fixes', summary: '1 fix.' }
    })
    expect(view.href).toBe('/overview/changelog/components-2-15-0')
  })
})

describe('toInline', () => {
  it('keeps code and links, and drops emphasis to text', () => {
    expect(
      toInline('Use **`Button`** with [href](/foundations/linking) now.')
    ).toEqual([
      'Use ',
      { code: 'Button' },
      ' with ',
      { text: 'href', href: '/foundations/linking' },
      ' now.'
    ])
  })
})
