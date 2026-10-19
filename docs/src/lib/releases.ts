import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const REPO_URL = 'https://github.com/TicketSolutionsPtyLtd/roadie'
export const CHANGELOG_ROUTE = '/overview/changelog'

/** The packages the changelog follows, in the order a release lists them. */
export const RELEASED_PACKAGES = [
  { name: '@oztix/roadie-components', label: 'Components', dir: 'components' },
  { name: '@oztix/roadie-core', label: 'Core', dir: 'core' },
  { name: '@oztix/roadie-charts', label: 'Charts', dir: 'charts' },
  { name: '@oztix/roadie-widgets', label: 'Widgets', dir: 'widgets' },
  {
    name: '@oztix/roadie-eslint-plugin',
    label: 'ESLint plugin',
    dir: 'eslint-plugin'
  }
] as const

export type Bump = 'major' | 'minor' | 'patch'
export type ChangeKind = 'new' | 'changed' | 'deprecated' | 'removed' | 'fixed'

/** The order and headings a release groups its changes under. */
export const CHANGE_KINDS: { kind: ChangeKind; title: string }[] = [
  { kind: 'new', title: 'New' },
  { kind: 'changed', title: 'Changed' },
  { kind: 'deprecated', title: 'Deprecated' },
  { kind: 'removed', title: 'Removed' },
  { kind: 'fixed', title: 'Fixed' }
]

export type PageLink = { title: string; href: string }

export type Change = {
  id: string
  kind: ChangeKind
  /** A major bump, or a first paragraph that says "breaking", as a change to an alpha or beta API in a minor does. */
  breaking: boolean
  /** Package names, such as `@oztix/roadie-core`. */
  packages: string[]
  /** The first sentence, as markdown. */
  summary: string
  /** The rest, as markdown, or empty. */
  details: string
  pages: PageLink[]
}

export type PackageVersion = {
  name: string
  label: string
  version: string
  /** The version's section of the package's changelog on GitHub. */
  href: string
}

export type Release = {
  /** Unique, and the release's anchor on the changelog page. */
  id: string
  /** `YYYY-MM-DD`, or null when the checkout has no history to date it. */
  date: string | null
  packages: PackageVersion[]
  changes: Change[]
}

export type PendingPackage = { name: string; label: string; bump: Bump }

export type ReleaseHistory = {
  unreleased: { packages: PendingPackage[]; changes: Change[] }
  releases: Release[]
}

export type ChangelogEntry = { id: string; bump: Bump; text: string }
export type ChangelogVersion = { version: string; entries: ChangelogEntry[] }

const BUMP_RANK: Record<Bump, number> = { patch: 0, minor: 1, major: 2 }
const SECTION_BUMPS: Record<string, Bump> = {
  'Major Changes': 'major',
  'Minor Changes': 'minor',
  'Patch Changes': 'patch'
}

const labelOf = (name: string) =>
  RELEASED_PACKAGES.find((pkg) => pkg.name === name)?.label ?? name

function entryFrom(raw: string, bump: Bump): ChangelogEntry | null {
  const text = raw.trim()
  if (text.startsWith('Updated dependencies')) return null
  const hash = text.match(/^([0-9a-f]{7,40}): (?:- )?/)
  const body = hash ? text.slice(hash[0].length).trim() : text
  if (!body) return null
  return { id: hash?.[1] ?? body.slice(0, 60), bump, text: body }
}

/** Each `## version` of a Changesets changelog, newest first, with its entries. */
export function parseChangelog(markdown: string): ChangelogVersion[] {
  return markdown
    .split(/^## /m)
    .slice(1)
    .map((block) => {
      const [heading = '', ...lines] = block.split('\n')
      const entries: ChangelogEntry[] = []
      let bump: Bump = 'patch'
      let current: string[] | null = null
      const flush = () => {
        const entry = current && entryFrom(current.join('\n'), bump)
        if (entry) entries.push(entry)
        current = null
      }
      for (const line of lines) {
        const section = line.match(/^### (.+)$/)
        if (section) {
          flush()
          bump = SECTION_BUMPS[section[1]!.trim()] ?? 'patch'
        } else if (line.startsWith('- ')) {
          flush()
          current = [line.slice(2)]
        } else if (current) {
          current.push(line.replace(/^ {2}/, ''))
        }
      }
      flush()
      return { version: heading.trim(), entries }
    })
}

export type Changeset = {
  id: string
  bumps: Record<string, Bump>
  text: string
}

/** A pending `.changeset/*.md`: the bump per package and the entry. */
export function parseChangeset(id: string, source: string): Changeset | null {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return null
  const bumps: Record<string, Bump> = {}
  for (const line of match[1]!.split('\n')) {
    const pkg = line.match(/^\s*['"]?([^'":]+)['"]?\s*:\s*(major|minor|patch)/)
    if (pkg) bumps[pkg[1]!.trim()] = pkg[2] as Bump
  }
  return { id, bumps, text: match[2]!.trim() }
}

/** The first sentence of the first paragraph, and everything after it. */
export function summarise(text: string): {
  summary: string
  details: string
} {
  const [first = '', ...rest] = text.trim().split(/\n\s*\n/)
  const paragraph = first.replace(/\s+/g, ' ').trim()
  const summary = paragraph.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? paragraph
  const remainder = paragraph.slice(summary.length).trim()
  return {
    summary,
    details: [remainder, ...rest.map((block) => block.trim())]
      .filter(Boolean)
      .join('\n\n')
  }
}

/**
 * The kind of change, from its bump and the wording of its first sentence.
 * Changesets use `patch` for a fix and `minor` for a new export, so the bump
 * decides unless the sentence says otherwise.
 */
export function classify(summary: string, bump: Bump): ChangeKind {
  const words = summary.replace(/`[^`]*`/g, 'code').toLowerCase()
  if (/^(remove[sd]?|drop(s|ped)?|delete[sd]?)\b/.test(words)) return 'removed'
  if (/\bdeprecat/.test(words)) return 'deprecated'
  if (bump === 'patch') {
    if (/^(add|adds|added)\b/.test(words)) return 'new'
    if (/^(raise[sd]?|bump(s|ed)?|update[sd]?|upgrade[sd]?)\b/.test(words))
      return 'changed'
    return 'fixed'
  }
  if (/^(add|adds|added|introduce[sd]?|new)\b/.test(words)) return 'new'
  if (
    /\b(now|no longer|instead|renamed?|replaces?|replaced|moves?|moved)\b/.test(
      words
    )
  )
    return 'changed'
  return 'new'
}

/** Name or import path → the docs page that covers it. */
export type PageIndex = Map<string, PageLink>

const MAX_PAGES = 4

/** The pages a change names in backticks, such as `Avatar` or `@oztix/roadie-core/records`, in the order it names them. */
export function linkPages(text: string, index: PageIndex): PageLink[] {
  const pages = new Map<string, PageLink>()
  for (const [, code = ''] of text.matchAll(/`([^`\n]+)`/g)) {
    const key = code.startsWith('@')
      ? code.trim()
      : code.match(/^<?([A-Za-z_$][\w$]*)/)?.[1]
    const page = key ? index.get(key) : undefined
    if (page && !pages.has(page.href)) pages.set(page.href, page)
    if (pages.size === MAX_PAGES) break
  }
  return [...pages.values()]
}

export function toChange(
  entry: { id: string; text: string; bump: Bump; packages: string[] },
  index: PageIndex
): Change {
  const { summary, details } = summarise(entry.text)
  const [lead = ''] = entry.text.split(/\n\s*\n/)
  const named = linkPages(summary, index)
  return {
    id: entry.id,
    kind: classify(summary, entry.bump),
    breaking: entry.bump === 'major' || /\bbreaking\b/i.test(lead),
    packages: entry.packages,
    summary,
    details,
    pages: named.length > 0 ? named : linkPages(lead, index)
  }
}

/** One entry per changeset, since a changeset that bumps several packages repeats in each changelog. */
function mergeEntries(
  entries: { id: string; text: string; bump: Bump; packages: string[] }[]
) {
  const byId = new Map<string, (typeof entries)[number]>()
  for (const entry of entries) {
    const seen = byId.get(entry.id)
    if (!seen) byId.set(entry.id, { ...entry, packages: [...entry.packages] })
    else {
      seen.packages.push(...entry.packages)
      if (BUMP_RANK[entry.bump] > BUMP_RANK[seen.bump]) seen.bump = entry.bump
    }
  }
  return [...byId.values()]
}

export type PackageChangelog = {
  name: string
  versions: ChangelogVersion[]
  /** Version → the commit that added its heading, with its Unix time. */
  commits: Map<string, { hash: string; date: string; time: number }>
}

export const changelogHref = (dir: string, version: string) =>
  `${REPO_URL}/blob/main/packages/${dir}/CHANGELOG.md#${version.replace(/\./g, '')}`

/**
 * Releases, newest first. A release is every package version added on one
 * day, dated by the commit that added its changelog heading. A version with
 * no commit, as in a shallow checkout, is a release of its own.
 */
export function groupReleases(
  changelogs: PackageChangelog[],
  index: PageIndex
): Release[] {
  type Group = {
    id: string
    date: string | null
    time: number
    packages: PackageVersion[]
    entries: { id: string; text: string; bump: Bump; packages: string[] }[]
  }
  const groups = new Map<string, Group>()
  let undated = 1
  for (const { name, versions, commits } of changelogs) {
    const dir = RELEASED_PACKAGES.find((pkg) => pkg.name === name)?.dir ?? name
    for (const { version, entries } of versions) {
      const commit = commits.get(version)
      const id = commit
        ? `release-${commit.date}`
        : `release-${dir}-${version.replace(/\W/g, '-')}`
      const group = groups.get(id) ?? {
        id,
        date: commit?.date ?? null,
        time: commit?.time ?? -undated++,
        packages: [],
        entries: []
      }
      if (commit) group.time = Math.max(group.time, commit.time)
      group.packages.push({
        name,
        label: labelOf(name),
        version,
        href: changelogHref(dir, version)
      })
      group.entries.push(
        ...entries.map((entry) => ({ ...entry, packages: [name] }))
      )
      groups.set(id, group)
    }
  }
  return [...groups.values()]
    .sort((a, b) => b.time - a.time)
    .map(({ id, date, packages, entries }) => ({
      id,
      date,
      packages,
      changes: mergeEntries(entries).map((entry) => toChange(entry, index))
    }))
}

/** What the pending changesets will release, limited to the packages the changelog follows. */
export function pendingChanges(
  changesets: Changeset[],
  index: PageIndex
): ReleaseHistory['unreleased'] {
  const tracked = new Set<string>(RELEASED_PACKAGES.map((pkg) => pkg.name))
  const bumps = new Map<string, Bump>()
  const changes: Change[] = []
  for (const { id, bumps: packageBumps, text } of changesets) {
    const packages = Object.keys(packageBumps).filter((name) =>
      tracked.has(name)
    )
    if (packages.length === 0 || !text) continue
    let bump: Bump = 'patch'
    for (const name of packages) {
      const next = packageBumps[name]!
      if (BUMP_RANK[next] > BUMP_RANK[bump]) bump = next
      const known = bumps.get(name)
      if (!known || BUMP_RANK[next] > BUMP_RANK[known]) bumps.set(name, next)
    }
    changes.push(toChange({ id, text, bump, packages }, index))
  }
  return {
    packages: RELEASED_PACKAGES.filter((pkg) => bumps.has(pkg.name)).map(
      ({ name, label }) => ({ name, label, bump: bumps.get(name)! })
    ),
    changes
  }
}

/** Changes of each kind, in `CHANGE_KINDS` order, leaving out empty kinds. */
export function byKind(changes: Change[]) {
  return CHANGE_KINDS.map(({ kind, title }) => ({
    kind,
    title,
    changes: changes.filter((change) => change.kind === kind)
  })).filter((group) => group.changes.length > 0)
}

type ManifestJson = {
  package?: string
  exports?: { subpath: string; import: string; values?: string[] }[]
  components?: { name: string; import: string; docs?: string }[]
}

const SITE_PREFIX = /^https:\/\/ticketsolutionsptyltd\.github\.io\/roadie/

/**
 * Names and import paths → docs pages, from the packages' manifests. A
 * component names its page; the other values of its subpath share it. A
 * core subpath links to the foundations, components, or charts page of the
 * same name when one exists.
 */
export function buildPageIndex(
  manifests: ManifestJson[],
  pageTitle: (route: string) => string | undefined
): PageIndex {
  const index: PageIndex = new Map()
  const add = (key: string, route: string) => {
    const title = pageTitle(route.split('#')[0]!)
    if (title && !index.has(key)) index.set(key, { title, href: route })
  }
  const routeOf = (docs: string) =>
    SITE_PREFIX.test(docs)
      ? docs.replace(SITE_PREFIX, '').replace(/\/(?=#|$)/, '') || '/'
      : undefined

  const components = manifests.flatMap((manifest) => manifest.components ?? [])
  for (const { name, docs } of components) {
    const route = docs && routeOf(docs)
    if (route) add(name, route)
  }
  for (const manifest of manifests) {
    for (const { subpath, import: path, values = [] } of manifest.exports ??
      []) {
      const owner = components.find(
        (component) => component.import === path && component.docs
      )
      const segment = subpath.split('/')[1]
      const route = owner?.docs
        ? routeOf(owner.docs)?.split('#')[0]
        : segment &&
          [
            `/foundations/${segment}`,
            `/components/${segment}`,
            `/charts/${segment}`
          ].find((candidate) => pageTitle(candidate))
      if (!route) continue
      add(path, route)
      for (const value of values) add(value, route)
    }
  }
  return index
}

/** A release a page names: the version of the page's package in it, and the release's anchor. */
export type ReleaseRef = {
  label: string
  version: string
  date: string | null
  id: string
}

export type PageRelease = {
  /** The first release with the page's component, or 'unreleased' when it's only pending. */
  added: ReleaseRef | 'unreleased' | null
  /** The newest release with a change that names the page, when that isn't `added`. */
  updated: ReleaseRef | null
  /** A pending change names the page. */
  upcoming: boolean
}

/** Docs route → the package of the first component it documents. */
export function pagePackages(manifests: ManifestJson[]): Map<string, string> {
  const packages = new Map<string, string>()
  for (const manifest of manifests) {
    for (const { docs } of manifest.components ?? []) {
      const route =
        docs && SITE_PREFIX.test(docs)
          ? docs.replace(SITE_PREFIX, '').split('#')[0]!.replace(/\/$/, '')
          : undefined
      if (route && manifest.package && !packages.has(route))
        packages.set(route, manifest.package)
    }
  }
  return packages
}

/** Route → the day its page file was first added, from `git log --diff-filter=A --name-only` under `docs/src/app`. */
export function pageCreatedDates(log: string): Map<string, string> {
  const dates = new Map<string, string>()
  for (const chunk of log.split('\x1e').slice(1)) {
    const [date = '', ...files] = chunk.trim().split('\n')
    for (const file of files) {
      const route = file.match(/^docs\/src\/app(\/.*)?\/page\.(mdx|tsx)$/)
      // `git log` runs newest first, so the last date seen is the oldest.
      if (route) dates.set(route[1] ?? '/', date)
    }
  }
  return dates
}

/**
 * When a page's component first shipped and last changed. Added is the
 * earlier of the first release of its package on or after the page's first
 * commit and the first release whose changes name the page.
 */
export function pageRelease(
  route: string,
  { releases, unreleased }: ReleaseHistory,
  { packageName, created }: { packageName?: string; created?: string } = {}
): PageRelease {
  const names = (change: Change) =>
    change.pages.some((page) => page.href.split('#')[0] === route)
  const ref = (release: Release, newest: boolean): ReleaseRef => {
    const named = release.changes.find(names)?.packages ?? []
    const own = release.packages.filter((pkg) => pkg.name === packageName)
    const candidates =
      own.length > 0
        ? own
        : release.packages.filter((pkg) => named.includes(pkg.name))
    const pkg =
      (newest ? candidates[0] : candidates.at(-1)) ?? release.packages[0]!
    return {
      label: pkg.label,
      version: pkg.version,
      date: release.date,
      id: release.id
    }
  }
  const oldestFirst = [...releases].reverse()
  const byDate =
    created && packageName
      ? oldestFirst.findIndex(
          (release) =>
            release.date !== null &&
            release.date >= created &&
            release.packages.some((pkg) => pkg.name === packageName)
        )
      : -1
  const byMention = oldestFirst.findIndex((release) =>
    release.changes.some(names)
  )
  const first = [byDate, byMention].filter((index) => index >= 0)
  const addedRelease =
    first.length > 0 ? oldestFirst[Math.min(...first)] : undefined
  const updatedRelease = releases.find((release) => release.changes.some(names))
  const upcoming = unreleased.changes.some(names)
  return {
    added: addedRelease
      ? ref(addedRelease, false)
      : created || upcoming
        ? 'unreleased'
        : null,
    updated:
      updatedRelease && updatedRelease.id !== addedRelease?.id
        ? ref(updatedRelease, true)
        : null,
    upcoming
  }
}

const ROOT = join(process.cwd(), '..')
const APP_DIR = join(process.cwd(), 'src/app')

function git(args: string[]): string | null {
  try {
    return execFileSync('git', ['-C', ROOT, ...args], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore']
    })
  } catch {
    return null
  }
}

/** Version → the oldest commit that added its `## version` heading, from `git log -p`. */
export function versionCommits(log: string) {
  const commits: PackageChangelog['commits'] = new Map()
  const chunks = log.split('\x1e').slice(1)
  for (const chunk of chunks) {
    const [head = '', ...lines] = chunk.split('\n')
    const [hash = '', date = '', time = '0'] = head.trim().split(' ')
    for (const line of lines) {
      const version = line.match(/^\+## (\S+)\s*$/)?.[1]
      // `git log` runs newest first, so the last commit seen is the oldest.
      if (version) commits.set(version, { hash, date, time: Number(time) })
    }
  }
  return commits
}

function readCommits(dir: string): PackageChangelog['commits'] {
  if (git(['rev-parse', '--is-shallow-repository'])?.trim() !== 'false')
    return new Map()
  const log = git([
    'log',
    '--format=%x1e%H %cs %ct',
    '-p',
    '--unified=0',
    '--no-color',
    '--',
    `packages/${dir}/CHANGELOG.md`
  ])
  return log ? versionCommits(log) : new Map()
}

function readJson<T>(path: string): T | undefined {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch {
    return undefined
  }
}

function pageTitle(route: string): string | undefined {
  for (const file of ['page.mdx', 'page.tsx']) {
    const path = join(APP_DIR, route, file)
    if (!existsSync(path)) continue
    return readFileSync(path, 'utf8').match(/title:\s*(['"])(.+?)\1/)?.[2]
  }
  return undefined
}

const readManifests = () =>
  RELEASED_PACKAGES.map(({ dir }) =>
    readJson<ManifestJson>(
      join(ROOT, 'packages', dir, 'dist/roadie.manifest.json')
    )
  ).filter((manifest) => manifest !== undefined)

function readPageIndex(): PageIndex {
  return buildPageIndex(readManifests(), pageTitle)
}

let pageContext:
  { packages: Map<string, string>; created: Map<string, string> } | undefined

/** Each page's added and updated releases, from the release history, its package, and its first commit. */
export function getPageRelease(route: string): PageRelease {
  pageContext ??= {
    packages: pagePackages(readManifests()),
    created:
      git(['rev-parse', '--is-shallow-repository'])?.trim() === 'false'
        ? pageCreatedDates(
            git([
              'log',
              '--diff-filter=A',
              '--format=%x1e%cs',
              '--name-only',
              '--',
              'docs/src/app'
            ]) ?? ''
          )
        : new Map()
  }
  return pageRelease(route, getReleaseHistory(), {
    packageName: pageContext.packages.get(route),
    created: pageContext.created.get(route)
  })
}

function readChangesets(): Changeset[] {
  const dir = join(ROOT, '.changeset')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .sort()
    .map((file) =>
      parseChangeset(file.slice(0, -3), readFileSync(join(dir, file), 'utf8'))
    )
    .filter((changeset) => changeset !== null)
}

let history: ReleaseHistory | undefined

/**
 * Every release of the packages the changelog follows, and what's pending,
 * read at build time from their changelogs, the pending changesets, and git
 * history for the dates.
 */
export function getReleaseHistory(): ReleaseHistory {
  if (history) return history
  const index = readPageIndex()
  const changelogs = RELEASED_PACKAGES.flatMap(({ name, dir }) => {
    const path = join(ROOT, 'packages', dir, 'CHANGELOG.md')
    if (!existsSync(path)) return []
    return [
      {
        name,
        versions: parseChangelog(readFileSync(path, 'utf8')),
        commits: readCommits(dir)
      }
    ]
  })
  history = {
    unreleased: pendingChanges(readChangesets(), index),
    releases: groupReleases(changelogs, index)
  }
  return history
}

const indent = (text: string) => text.replace(/^(?=.)/gm, '  ')

function changesMarkdown(
  changes: Change[],
  resolve: (href: string) => string
): string {
  return byKind(changes)
    .map(({ title, changes: group }) =>
      [
        `### ${title}`,
        group
          .map((change) => {
            const see = change.pages
              .map(({ title: page, href }) => `[${page}](${resolve(href)})`)
              .join(', ')
            return [
              `- ${change.breaking ? '**Breaking.** ' : ''}${change.summary}`,
              see && indent(`See ${see}.`),
              change.details && indent(change.details)
            ]
              .filter(Boolean)
              .join('\n\n')
          })
          .join('\n')
      ].join('\n\n')
    )
    .join('\n\n')
}

/** The changelog page's history as markdown, for its markdown copy. */
export function releaseHistoryMarkdown(
  { unreleased, releases }: ReleaseHistory,
  resolve: (href: string) => string,
  formatDate: (date: string) => string
): string {
  const sections: string[] = []
  if (unreleased.changes.length > 0) {
    sections.push(
      [
        '## Unreleased',
        `Not on npm yet. Goes to ${unreleased.packages.map(({ name, bump }) => `\`${name}\` (${bump})`).join(', ')}.`,
        changesMarkdown(unreleased.changes, resolve)
      ].join('\n\n')
    )
  }
  for (const release of releases) {
    const versions = release.packages
      .map(({ name, version, href }) => `[\`${name}@${version}\`](${href})`)
      .join(', ')
    sections.push(
      [
        `## ${release.date ? formatDate(release.date) : versions}`,
        versions,
        changesMarkdown(release.changes, resolve)
      ].join('\n\n')
    )
  }
  return sections.join('\n\n')
}
