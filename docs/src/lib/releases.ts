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
  /** A major bump: code written for the last version may need to change. */
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
const CHANGED_VERBS =
  /^(raise[sd]?|bump(s|ed)?|update[sd]?|upgrade[sd]?|migrate[sd]?|refine[sd]?|align(s|ed)?)\b/

export function classify(summary: string, bump: Bump): ChangeKind {
  const words = summary.replace(/`[^`]*`/g, 'code').toLowerCase()
  if (/^(remove[sd]?|drop(s|ped)?|delete[sd]?)\b/.test(words)) return 'removed'
  if (/\bdeprecat/.test(words)) return 'deprecated'
  if (CHANGED_VERBS.test(words)) return 'changed'
  if (bump === 'patch') {
    if (/^(add|adds|added)\b/.test(words)) return 'new'
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
    breaking: entry.bump === 'major',
    packages: entry.packages,
    summary,
    details,
    pages: named.length > 0 ? named : linkPages(lead, index)
  }
}

/**
 * One entry per changeset, since a changeset that bumps several packages
 * repeats in each changelog. Matched by text, not hash: every changeset a
 * commit added carries that commit's hash.
 */
function mergeEntries(
  entries: { id: string; text: string; bump: Bump; packages: string[] }[]
) {
  const byText = new Map<string, (typeof entries)[number]>()
  for (const entry of entries) {
    const seen = byText.get(entry.text)
    if (!seen)
      byText.set(entry.text, { ...entry, packages: [...entry.packages] })
    else {
      seen.packages.push(...entry.packages)
      if (BUMP_RANK[entry.bump] > BUMP_RANK[seen.bump]) seen.bump = entry.bump
    }
  }
  const ids = new Set<string>()
  return [...byText.values()].map((entry) => {
    let id = entry.id
    for (let n = 2; ids.has(id); n++) id = `${entry.id}-${n}`
    ids.add(id)
    return { ...entry, id }
  })
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
      // The root barrel re-exports every component, so it names no one page.
      if (subpath === '.') continue
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
    const [hash = '', seconds = '0'] = head.trim().split(' ')
    const time = Number(seconds)
    // In UTC, not the committer's zone, which differs by who merged.
    const date = new Date(time * 1000).toISOString().slice(0, 10)
    for (const line of lines) {
      const version = line.match(/^\+## (\S+)\s*$/)?.[1]
      // `git log` runs newest first, so the last commit seen is the oldest.
      if (version) commits.set(version, { hash, date, time })
    }
  }
  return commits
}

function readCommits(dir: string): PackageChangelog['commits'] {
  if (git(['rev-parse', '--is-shallow-repository'])?.trim() !== 'false')
    return new Map()
  const log = git([
    'log',
    '--format=%x1e%H %ct',
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

function readPageIndex(): PageIndex {
  const manifests = RELEASED_PACKAGES.map(({ dir }) =>
    readJson<ManifestJson>(
      join(ROOT, 'packages', dir, 'dist/roadie.manifest.json')
    )
  ).filter((manifest) => manifest !== undefined)
  return buildPageIndex(manifests, pageTitle)
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
