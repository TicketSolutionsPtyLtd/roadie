import type { PhrasingContent } from 'mdast'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { parse as parseYaml } from 'yaml'

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

/** A package's short name, as the changelog's `?package=` filter takes it. */
export type PackageKey = (typeof RELEASED_PACKAGES)[number]['dir']

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
  /** A major bump, or a first paragraph that opens with "Breaking", as a change to an alpha or beta API in a minor does. */
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
  /** Unique: the release's anchor on the changelog and its own page's slug. */
  id: string
  /** `YYYY-MM-DD` in UTC, or null when the checkout has no history to date it. */
  date: string | null
  /** The versioning commit's Unix time, or null without history. */
  time: number | null
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

/** A commit's day in UTC, not the committer's zone, which differs by who merged. */
const utcDate = (seconds: number) =>
  new Date(seconds * 1000).toISOString().slice(0, 10)

const packageOf = (name: string) =>
  RELEASED_PACKAGES.find((pkg) => pkg.name === name)
const labelOf = (name: string) => packageOf(name)?.label ?? name

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
    breaking: entry.bump === 'major' || /^\W*breaking\b/i.test(lead),
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

const PACKAGE_ORDER = new Map<string, number>(
  RELEASED_PACKAGES.map((pkg, index) => [pkg.name, index])
)

const orderOf = (name: string) => PACKAGE_ORDER.get(name) ?? Infinity

/** A release's slug, from the first package it versions, such as `components-2-15-0`. */
export function releaseSlug(packages: { name: string; version: string }[]) {
  const [lead] = [...packages].sort((a, b) => orderOf(a.name) - orderOf(b.name))
  if (!lead) return 'release'
  const dir = packageOf(lead.name)?.dir ?? lead.name.replace(/\W+/g, '-')
  return `${dir}-${lead.version.replace(/[^\w]+/g, '-')}`
}

/**
 * Releases, newest first. A release is the package versions one commit
 * added, which is how Changesets versions packages together, dated in UTC
 * by that commit. A version with no commit, as in a shallow checkout, is a
 * release of its own, ordered newest first across packages.
 */
export function groupReleases(
  changelogs: PackageChangelog[],
  index: PageIndex
): Release[] {
  type Group = {
    date: string | null
    time: number
    packages: PackageVersion[]
    entries: { id: string; text: string; bump: Bump; packages: string[] }[]
  }
  const groups = new Map<string, Group>()
  for (const { name, versions, commits } of changelogs) {
    const dir = packageOf(name)?.dir ?? name
    versions.forEach(({ version, entries }, age) => {
      const commit = commits.get(version)
      const key = commit
        ? `commit:${commit.hash}`
        : `version:${name}@${version}`
      const group = groups.get(key) ?? {
        date: commit?.date ?? null,
        // Undated versions interleave by age, then by package order.
        time:
          commit?.time ??
          -(age * RELEASED_PACKAGES.length + Math.min(orderOf(name), 99)) - 1,
        packages: [],
        entries: []
      }
      group.packages.push({
        name,
        label: labelOf(name),
        version,
        href: changelogHref(dir, version)
      })
      group.entries.push(
        ...entries.map((entry) => ({ ...entry, packages: [name] }))
      )
      groups.set(key, group)
    })
  }
  const slugs = new Set<string>()
  return [...groups.values()]
    .sort((a, b) => b.time - a.time)
    .map(({ date, time, packages, entries }) => {
      packages.sort((a, b) => orderOf(a.name) - orderOf(b.name))
      let id = releaseSlug(packages)
      for (let n = 2; slugs.has(id); n++) id = `${releaseSlug(packages)}-${n}`
      slugs.add(id)
      return {
        id,
        date,
        time: date === null ? null : time,
        packages,
        changes: mergeEntries(entries).map((entry) => toChange(entry, index))
      }
    })
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
export function byKind<T extends { kind: ChangeKind }>(changes: T[]) {
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

export type PageSubpath = { packageName: string; importPath: string }

/** Docs route → the package and import path of the first component it documents. */
export function pageSubpaths(
  manifests: ManifestJson[]
): Map<string, PageSubpath> {
  const subpaths = new Map<string, PageSubpath>()
  for (const manifest of manifests) {
    for (const { docs, import: importPath } of manifest.components ?? []) {
      const route =
        docs && SITE_PREFIX.test(docs)
          ? docs.replace(SITE_PREFIX, '').split('#')[0]!.replace(/\/$/, '')
          : undefined
      if (route && manifest.package && !subpaths.has(route))
        subpaths.set(route, { packageName: manifest.package, importPath })
    }
  }
  return subpaths
}

/**
 * Import path → the Unix time it first appeared: an `exports` key added to
 * a package's `package.json`, from `git log -p`, or a component folder
 * added under `packages/components/src/components`, whose subpaths a
 * wildcard exports, from `git log --diff-filter=A --name-only`.
 */
export function subpathTimes(exportsLog: string, foldersLog: string) {
  const times = new Map<string, number>()
  // `git log` runs newest first, so the last time seen is the oldest.
  for (const chunk of exportsLog.split('\x1e').slice(1)) {
    const [seconds = '0', ...lines] = chunk.split('\n')
    let name: string | undefined
    for (const line of lines) {
      const file = line.match(/^\+\+\+ b\/packages\/([^/]+)\/package\.json$/)
      if (file)
        name = RELEASED_PACKAGES.find((pkg) => pkg.dir === file[1])?.name
      const key = line.match(/^\+\s+"\.\/([^"*]+)"\s*:/)?.[1]
      if (name && key) times.set(`${name}/${key}`, Number(seconds))
    }
  }
  for (const chunk of foldersLog.split('\x1e').slice(1)) {
    const [seconds = '0', ...files] = chunk.trim().split('\n')
    for (const file of files) {
      const folder = file.match(
        /^packages\/components\/src\/components\/([^/]+)\/index\.tsx$/
      )?.[1]
      if (folder)
        times.set(`@oztix/roadie-components/${kebab(folder)}`, Number(seconds))
    }
  }
  return times
}

/** Route → the day, in UTC, its page file was first added, from `git log --diff-filter=A --name-only` under `docs/src/app`. */
export function pageCreatedDates(log: string): Map<string, string> {
  const dates = new Map<string, string>()
  for (const chunk of log.split('\x1e').slice(1)) {
    const [seconds = '0', ...files] = chunk.trim().split('\n')
    const date = utcDate(Number(seconds))
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
  {
    packageName,
    created,
    shipped
  }: {
    packageName?: string
    created?: string
    /** When the page's import path first appeared, which decides `added` when known. */
    shipped?: number
  } = {}
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
  const ownPackage = (release: Release) =>
    release.packages.some((pkg) => pkg.name === packageName)
  const byShipped =
    shipped !== undefined && packageName
      ? oldestFirst.findIndex(
          (release) =>
            release.time !== null &&
            release.time >= shipped &&
            ownPackage(release)
        )
      : -1
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
  // The subpath's first release is exact; a mention or the page's age only estimates it.
  const first =
    shipped !== undefined
      ? [byShipped].filter((index) => index >= 0)
      : [byDate, byMention].filter((index) => index >= 0)
  const addedRelease =
    first.length > 0 ? oldestFirst[Math.min(...first)] : undefined
  const updatedRelease = releases.find((release) => release.changes.some(names))
  const upcoming = unreleased.changes.some(names)
  return {
    added: addedRelease
      ? ref(addedRelease, false)
      : created || upcoming || shipped !== undefined
        ? 'unreleased'
        : null,
    updated:
      updatedRelease && updatedRelease.id !== addedRelease?.id
        ? ref(updatedRelease, true)
        : null,
    upcoming
  }
}

/** A page's status and releases as one plain sentence, for its markdown copy. */
export function statusSentence(
  status: string,
  { added, updated, upcoming }: PageRelease,
  formatDate: (date: string) => string
): string {
  const parts = [`Status: ${status}.`]
  if (added === 'unreleased') parts.push('Not released yet.')
  else if (added) parts.push(`Added in ${added.label} ${added.version}.`)
  if (updated)
    parts.push(
      `Updated in ${updated.label} ${updated.version}${updated.date ? `, ${formatDate(updated.date)}` : ''}.`
    )
  if (upcoming && added !== 'unreleased')
    parts.push('More changes are in the next release.')
  return parts.join(' ')
}

// Views: what the changelog page draws for each release.

/** Markdown inline content, flattened to text, code, and links so the client renders it without a parser. */
export type Inline = (
  string | { code: string } | { text: string; href: string }
)[]

/** A highlight, such as a new component or a breaking change, drawn as a card. */
export type ReleaseCard = {
  id: string
  title: string
  /** The first thing the card names, for the release's title. */
  name: string
  description: Inline
  /** The docs page the card opens. */
  href?: string
  /** A screenshot under `docs/public`, from a release note. */
  image?: string
  /** The catalogue page whose index art the card shows. */
  art?: string
  breaking: boolean
  packages: PackageKey[]
}

/** A smaller change, listed under the cards. */
export type ReleaseItem = {
  id: string
  kind: ChangeKind
  text: Inline
  page?: PageLink
  packages: PackageKey[]
}

export type ReleaseVersion = {
  package: PackageKey
  label: string
  /** The version, or none while it's pending. */
  version?: string
  /** The version's entry in the package's changelog on GitHub. */
  href?: string
}

export type Headline = { title: string; summary: string }

export type ReleaseView = {
  /** The release's anchor on the changelog and the last segment of its own page. */
  slug: string
  /** Its own page. */
  href: string
  /** `YYYY-MM-DD` in UTC, or null when pending or undated. */
  date: string | null
  pending: boolean
  versions: ReleaseVersion[]
  /** The title and summary for the whole release, and for each package in it, as the filter shows it. */
  headlines: { all: Headline } & Partial<Record<PackageKey, Headline>>
  cards: ReleaseCard[]
  items: ReleaseItem[]
}

const inlineParser = unified().use(remarkParse)

function flatten(nodes: PhrasingContent[], out: Inline) {
  for (const node of nodes) {
    if (node.type === 'inlineCode') out.push({ code: node.value })
    else if (node.type === 'link') {
      const text: Inline = []
      flatten(node.children, text)
      out.push({ text: plainText(text), href: node.url })
    } else if ('children' in node)
      flatten(node.children as PhrasingContent[], out)
    else if (node.type === 'break') out.push(' ')
    else if ('value' in node) out.push(node.value)
  }
}

/** A line of markdown as text, code, and links. Emphasis drops to plain text. */
export function toInline(markdown: string): Inline {
  const [first] = inlineParser.parse(markdown).children
  if (first?.type !== 'paragraph') return [markdown]
  const out: Inline = []
  flatten(first.children, out)
  return out.reduce<Inline>((merged, part) => {
    const last = merged.at(-1)
    if (typeof part === 'string' && typeof last === 'string')
      merged[merged.length - 1] = last + part
    else merged.push(part)
    return merged
  }, [])
}

/** `OTPField` → `otp-field`, as component pages are named. */
const kebab = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()

/** The page a component name or import path has to itself. */
function ownPage(name: string, index: PageIndex): PageLink | undefined {
  const page = index.get(name)
  if (!page) return undefined
  if (name.startsWith('@')) return page
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) return undefined
  return page.href.split('#')[0]!.split('/').at(-1) === kebab(name)
    ? page
    : undefined
}

const ADDS = /^(?:Add|Adds|Added|Introduces?|New)\s+(?:the\s+)?/

/**
 * The pages of what a change adds, when it opens by naming them, such as
 * "Add `DateField` (`…/date-field`) and `TimeField`, typed fields", and what
 * it says after the names.
 */
export function addedPages(
  summary: string,
  index: PageIndex
): { pages: PageLink[]; rest: string } | null {
  const lead = summary.match(ADDS)
  if (!lead) return null
  let rest = summary.slice(lead[0].length)
  const pages: PageLink[] = []
  for (;;) {
    const code = rest.match(/^`([^`\n]+)`/)
    if (!code) break
    const page = ownPage(code[1]!.trim(), index)
    if (!page) return null
    if (!pages.some((known) => known.href === page.href)) pages.push(page)
    rest = rest.slice(code[0].length)
    rest = rest.replace(/^\s*(?:\(`[^`]+`\)|(?:at|from)\s+`[^`]+`)/, '')
    const separator = rest.match(/^(?:,\s*and\s+|\s+and\s+|,\s*)(?=`)/)
    if (!separator) break
    rest = rest.slice(separator[0].length)
  }
  return pages.length > 0 ? { pages, rest: rest.trim() } : null
}

export const plainText = (inline: Inline) =>
  inline
    .map((part) =>
      typeof part === 'string' ? part : 'code' in part ? part.code : part.text
    )
    .join('')

const capitalise = (text: string) =>
  text ? `${text[0]!.toUpperCase()}${text.slice(1)}` : text

export type PageInfo = (
  route: string
) => { title: string; description?: string } | undefined

const ART_ROUTE = /^\/(components|charts|foundations)\/[\w-]+$/

const artOf = (href: string | undefined) => {
  const route = href?.split('#')[0]
  return route && ART_ROUTE.test(route) ? route : undefined
}

const keysOf = (names: string[]) =>
  names.flatMap((name) => {
    const dir = packageOf(name)?.dir
    return dir ? [dir] : []
  })

/** A change as a card: a new component, titled by its page, or a breaking change, titled by its subject. */
export function cardOf(
  change: Change,
  index: PageIndex,
  pageInfo: PageInfo
): ReleaseCard | null {
  const packages = keysOf(change.packages)
  if (change.breaking) {
    // A bold lead such as "**Peer dependency change: React 19.2 is required.**" names its subject.
    const bold = change.summary.match(/^\*\*([^:*]+):/)?.[1]?.trim()
    const subject = bold && !/^breaking\b/i.test(bold) ? bold : undefined
    const plain = change.summary
      .replace(/\*\*/g, '')
      .replace(/^[^:]*:\s*/, (lead) =>
        subject || /^breaking\b/i.test(lead) ? '' : lead
      )
    const code = change.summary.match(/`([A-Z@][\w./-]*)`/)?.[1]
    const [page] = change.pages
    const opening = plain
      .split(/[:;(—]/)[0]!
      .replace(/[.!]$/, '')
      .trim()
    const title =
      subject ||
      page?.title ||
      code ||
      (opening.length <= 60 ? capitalise(opening) : GENERIC_BREAKING)
    // A title that took the whole first sentence leaves the details to describe it.
    const { summary: next } = summarise(change.details)
    const description =
      title === capitalise(opening)
        ? /^[A-Za-z`]/.test(next)
          ? next
          : ''
        : plain
    return {
      id: change.id,
      title,
      name: title,
      description: toInline(capitalise(description)),
      href: page?.href,
      art: artOf(page?.href),
      breaking: true,
      packages
    }
  }
  if (change.kind !== 'new') return null
  const added = addedPages(change.summary, index)
  if (!added) return null
  const [page] = added.pages
  const appositive = added.rest
    .match(/^[,:]\s*(.+)$/)?.[1]
    ?.replace(/^which\s+/, '')
  const description = appositive
    ? capitalise(appositive)
    : (pageInfo(page!.href.split('#')[0]!)?.description ?? '')
  return {
    id: change.id,
    title: andList(added.pages.map((added) => added.title)),
    name: page!.title,
    description: toInline(description),
    href: page!.href,
    art: artOf(page!.href),
    breaking: false,
    packages
  }
}

/** Names joined with commas and a closing "and", with the Oxford comma from three. */
export function andList(names: string[]) {
  if (names.length < 3) return names.join(' and ')
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`
}

const TITLE_NAMES = 3

const named = (names: string[]) =>
  andList(
    names.length > TITLE_NAMES
      ? [...names.slice(0, TITLE_NAMES), 'more']
      : names
  )

const GENERIC_BREAKING = 'Breaking change'

/** The pages the changes touch most, most first. */
function busiestPages(items: ReleaseItem[]) {
  const counts = new Map<string, number>()
  for (const { page } of items)
    if (page) counts.set(page.title, (counts.get(page.title) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1]).map(([title]) => title)
}

/** A title from the highlights, then the pages the other changes touch most. */
export function releaseTitle(cards: ReleaseCard[], items: ReleaseItem[]) {
  const names = [
    ...new Set(
      cards.flatMap((card) =>
        card.name === GENERIC_BREAKING ? [] : [card.name]
      )
    )
  ]
  const pages = busiestPages(items).filter((title) => !names.includes(title))
  if (names.length > 0) {
    const all = [...names, ...pages]
    const shown = all.slice(0, TITLE_NAMES)
    const more = all.length > shown.length || items.some((item) => !item.page)
    return andList(more ? [...shown, 'more'] : shown)
  }
  if (pages.length > 0) return `Updates to ${named(pages)}`
  if (cards.length > 0 && items.length === 0) return GENERIC_BREAKING
  if (items.length === 0) return 'Dependency updates'
  // A lone change's opening words, such as "Add a date and time standard".
  const [lone] = items
  const opening = lone?.text[0]
  const words =
    typeof opening === 'string' && /^[A-Z]/.test(opening)
      ? plainText(lone!.text)
          .split(/[:;(—]/)[0]!
          .replace(/[.!]$/, '')
          .trim()
      : ''
  if (items.length === 1 && words && words.length <= 48) return words
  return items.every((item) => item.kind === 'fixed') ? 'Fixes' : 'Updates'
}

const SUMMARY_NOUNS: Record<ChangeKind, [string, string]> = {
  new: ['addition', 'additions'],
  changed: ['change', 'changes'],
  deprecated: ['deprecation', 'deprecations'],
  removed: ['removal', 'removals'],
  fixed: ['fix', 'fixes']
}

const count = (n: number, [one, many]: [string, string]) =>
  `${n} ${n === 1 ? one : many}`

/** One line counting what a release holds, such as "4 additions, 2 changes, and 5 fixes." */
export function releaseSummary(cards: ReleaseCard[], items: ReleaseItem[]) {
  const counts = new Map<ChangeKind, number>()
  const add = (kind: ChangeKind) =>
    counts.set(kind, (counts.get(kind) ?? 0) + 1)
  const breaking = cards.filter((card) => card.breaking).length
  for (const card of cards) if (!card.breaking) add('new')
  for (const item of items) add(item.kind)
  const parts = [
    ...(breaking > 0
      ? [count(breaking, ['breaking change', 'breaking changes'])]
      : []),
    ...CHANGE_KINDS.flatMap(({ kind }) => {
      const n = counts.get(kind)
      return n ? [count(n, SUMMARY_NOUNS[kind])] : []
    })
  ]
  return parts.length > 0
    ? `${capitalise(andList(parts))}.`
    : 'Dependency updates only.'
}

export type ReleaseNoteHighlight =
  | string
  | {
      title: string
      description?: string
      href?: string
      image?: string
      packages?: PackageKey[]
    }

/** A hand-written release note: `docs/src/content/releases/<package>-<version>.md`. */
export type ReleaseNote = {
  title?: string
  summary?: string
  highlights?: ReleaseNoteHighlight[]
}

const NOTE_FIELDS = new Set(['title', 'summary', 'highlights'])
const HIGHLIGHT_FIELDS = new Set([
  'title',
  'description',
  'href',
  'image',
  'packages'
])

/** A release note's frontmatter. Anything it doesn't know fails the build, so a typo never ships silently. */
export function parseReleaseNote(file: string, source: string): ReleaseNote {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) throw new Error(`${file} has no frontmatter.`)
  const note: unknown = parseYaml(match[1]!)
  const fail = (problem: string) => {
    throw new Error(`${file}: ${problem}`)
  }
  if (!note || typeof note !== 'object') return fail('frontmatter is empty')
  for (const key of Object.keys(note))
    if (!NOTE_FIELDS.has(key)) fail(`unknown field "${key}"`)
  const { title, summary, highlights } = note as Record<string, unknown>
  if (title !== undefined && typeof title !== 'string')
    fail('title is not text')
  if (summary !== undefined && typeof summary !== 'string')
    fail('summary is not text')
  if (highlights !== undefined && !Array.isArray(highlights))
    fail('highlights is not a list')
  for (const highlight of (highlights as unknown[] | undefined) ?? []) {
    if (typeof highlight === 'string') continue
    if (!highlight || typeof highlight !== 'object')
      fail('a highlight is neither a title nor a card')
    const card = highlight as Record<string, unknown>
    for (const key of Object.keys(card))
      if (!HIGHLIGHT_FIELDS.has(key)) fail(`unknown highlight field "${key}"`)
    if (typeof card.title !== 'string') fail('a highlight card has no title')
    if (
      card.packages !== undefined &&
      !(
        Array.isArray(card.packages) &&
        card.packages.every((key) =>
          RELEASED_PACKAGES.some((pkg) => pkg.dir === key)
        )
      )
    )
      fail(
        `"${card.title}" names a package that isn't one of ${RELEASED_PACKAGES.map((pkg) => pkg.dir).join(', ')}`
      )
  }
  return note as ReleaseNote
}

/**
 * The cards a note lists come first, in its order: a title picks an
 * automatic card, and a card with a title of its own adds one or overrides
 * the automatic card of that title. The rest follow.
 */
export function applyNote(
  cards: ReleaseCard[],
  note: ReleaseNote,
  releasePackages: PackageKey[],
  where = 'the release note'
): ReleaseCard[] {
  const remaining = [...cards]
  const take = (title: string) => {
    const at = remaining.findIndex(
      (card) => card.title.toLowerCase() === title.toLowerCase()
    )
    return at >= 0 ? remaining.splice(at, 1)[0] : undefined
  }
  const listed = (note.highlights ?? []).map((highlight, index) => {
    if (typeof highlight === 'string') {
      const card = take(highlight)
      if (!card)
        throw new Error(
          `${where} lists "${highlight}", which is not one of this release's highlights: ${cards.map((card) => card.title).join(', ')}.`
        )
      return card
    }
    const base = take(highlight.title)
    return {
      id: base?.id ?? `note-${index + 1}`,
      title: highlight.title,
      name: highlight.title,
      description: highlight.description
        ? toInline(highlight.description)
        : (base?.description ?? []),
      href: highlight.href ?? base?.href,
      image: highlight.image ?? base?.image,
      art: highlight.image ? undefined : (artOf(highlight.href) ?? base?.art),
      breaking: base?.breaking ?? false,
      packages: highlight.packages ?? base?.packages ?? releasePackages
    }
  })
  return [...listed, ...remaining]
}

const headline = (cards: ReleaseCard[], items: ReleaseItem[]): Headline => ({
  title: releaseTitle(cards, items),
  summary: releaseSummary(cards, items)
})

/** A release as the changelog draws it: cards for its highlights, a list for the rest, and a headline for each filter. */
export function toReleaseView(
  release: {
    slug: string
    date: string | null
    pending: boolean
    versions: ReleaseVersion[]
    changes: Change[]
  },
  {
    index,
    pageInfo,
    note,
    where
  }: {
    index: PageIndex
    pageInfo: PageInfo
    note?: ReleaseNote
    where?: string
  }
): ReleaseView {
  const auto: ReleaseCard[] = []
  const items: ReleaseItem[] = []
  for (const change of release.changes) {
    const card = cardOf(change, index, pageInfo)
    if (card) auto.push(card)
    else
      items.push({
        id: change.id,
        kind: change.kind,
        text: toInline(change.summary),
        page: change.pages[0],
        packages: keysOf(change.packages)
      })
  }
  const keys = release.versions.map((version) => version.package)
  const cards = note ? applyNote(auto, note, keys, where) : auto
  const all = headline(cards, items)
  const headlines: ReleaseView['headlines'] = {
    all: {
      title: note?.title ?? all.title,
      summary: note?.summary ?? all.summary
    }
  }
  for (const key of keys)
    headlines[key] = headline(
      cards.filter((card) => card.packages.includes(key)),
      items.filter((item) => item.packages.includes(key))
    )
  return {
    slug: release.slug,
    href: `${CHANGELOG_ROUTE}/${release.slug}`,
    date: release.date,
    pending: release.pending,
    versions: release.versions,
    headlines,
    cards,
    items
  }
}

const ROOT = join(process.cwd(), '..')
const APP_DIR = join(process.cwd(), 'src/app')
const NOTES_DIR = join(process.cwd(), 'src/content/releases')

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
    const date = utcDate(time)
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

function pageSource(route: string): string | undefined {
  for (const file of ['page.mdx', 'page.tsx']) {
    const path = join(APP_DIR, route, file)
    if (existsSync(path)) return readFileSync(path, 'utf8')
  }
  return undefined
}

const metadataField = (source: string | undefined, field: string) =>
  source
    ?.match(new RegExp(`${field}:\\s*(['"])((?:\\\\.|(?!\\1).)+)\\1`))?.[2]
    ?.replace(/\\(.)/g, '$1')

function pageTitle(route: string): string | undefined {
  return metadataField(pageSource(route), 'title')
}

const readPageInfo: PageInfo = (route) => {
  const source = pageSource(route)
  const title = metadataField(source, 'title')
  return title
    ? { title, description: metadataField(source, 'description') }
    : undefined
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
  | {
      subpaths: Map<string, PageSubpath>
      created: Map<string, string>
      shipped: Map<string, number>
    }
  | undefined

/** Each page's added and updated releases, from the release history, its subpath's first commit, and the page's own. */
export function getPageRelease(route: string): PageRelease {
  const history =
    git(['rev-parse', '--is-shallow-repository'])?.trim() === 'false'
  const log = (args: string[]) => (history ? (git(['log', ...args]) ?? '') : '')
  pageContext ??= {
    subpaths: pageSubpaths(readManifests()),
    created: pageCreatedDates(
      log([
        '--diff-filter=A',
        '--format=%x1e%ct',
        '--name-only',
        '--',
        'docs/src/app'
      ])
    ),
    shipped: subpathTimes(
      log([
        '--format=%x1e%ct',
        '-p',
        '--unified=0',
        '--no-color',
        '--',
        ...RELEASED_PACKAGES.map(({ dir }) => `packages/${dir}/package.json`)
      ]),
      log([
        '--diff-filter=A',
        '--format=%x1e%ct',
        '--name-only',
        '--',
        'packages/components/src/components'
      ])
    )
  }
  const subpath = pageContext.subpaths.get(route)
  return pageRelease(route, getReleaseHistory(), {
    packageName: subpath?.packageName,
    created: pageContext.created.get(route),
    shipped: subpath && pageContext.shipped.get(subpath.importPath)
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

/** Release notes by the package version they're named after, such as `components-2.15.0`. */
function readNotes(): Map<string, { file: string; note: ReleaseNote }> {
  const notes = new Map<string, { file: string; note: ReleaseNote }>()
  if (!existsSync(NOTES_DIR)) return notes
  for (const file of readdirSync(NOTES_DIR)) {
    if (!file.endsWith('.md') || file === 'README.md') continue
    const where = `docs/src/content/releases/${file}`
    notes.set(file.slice(0, -3), {
      file: where,
      note: parseReleaseNote(where, readFileSync(join(NOTES_DIR, file), 'utf8'))
    })
  }
  return notes
}

let history: ReleaseHistory | undefined
let index: PageIndex | undefined

/**
 * Every release of the packages the changelog follows, and what's pending,
 * read at build time from their changelogs, the pending changesets, and git
 * history for the dates.
 */
export function getReleaseHistory(): ReleaseHistory {
  if (history) return history
  index ??= readPageIndex()
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

export const UNRELEASED_SLUG = 'unreleased'

/** Views of every release, with what's pending first, each with its release note applied. */
export function views(
  { unreleased, releases }: ReleaseHistory,
  {
    index,
    pageInfo,
    notes
  }: {
    index: PageIndex
    pageInfo: PageInfo
    notes: Map<string, { file: string; note: ReleaseNote }>
  }
): ReleaseView[] {
  const used = new Set<string>()
  const noteFor = (packages: PackageVersion[]) => {
    for (const { name, version } of packages) {
      const key = `${packageOf(name)?.dir ?? name}-${version}`
      const found = notes.get(key)
      if (found) {
        used.add(key)
        return found
      }
    }
    return undefined
  }
  const result: ReleaseView[] = []
  if (unreleased.changes.length > 0)
    result.push(
      toReleaseView(
        {
          slug: UNRELEASED_SLUG,
          date: null,
          pending: true,
          versions: unreleased.packages.map(({ name, label }) => ({
            package: packageOf(name)!.dir,
            label
          })),
          changes: unreleased.changes
        },
        { index, pageInfo }
      )
    )
  for (const release of releases) {
    const found = noteFor(release.packages)
    result.push(
      toReleaseView(
        {
          slug: release.id,
          date: release.date,
          pending: false,
          versions: release.packages.flatMap(
            ({ name, label, version, href }) => {
              const dir = packageOf(name)?.dir
              return dir ? [{ package: dir, label, version, href }] : []
            }
          ),
          changes: release.changes
        },
        { index, pageInfo, note: found?.note, where: found?.file }
      )
    )
  }
  for (const [key, { file }] of notes)
    if (!used.has(key))
      throw new Error(
        `${file} names no released version. Name it after a version in the release, such as components-2.15.0.md.`
      )
  return result
}

let releaseViews: ReleaseView[] | undefined

/** Every release as the changelog draws it, pending first. */
export function getReleaseViews(): ReleaseView[] {
  releaseViews ??= views(getReleaseHistory(), {
    index: (index ??= readPageIndex()),
    pageInfo: readPageInfo,
    notes: readNotes()
  })
  return releaseViews
}

// Markdown: the copy agents read, which carries every change in full.

const indent = (text: string) => text.replace(/^(?=.)/gm, '  ')

function changesMarkdown(
  changes: Change[],
  resolve: (href: string) => string,
  depth = 3
): string {
  return byKind(changes)
    .map(({ title, changes: group }) =>
      [
        `${'#'.repeat(depth)} ${title}`,
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

const inlineMarkdown = (inline: Inline) =>
  inline
    .map((part) =>
      typeof part === 'string'
        ? part
        : 'code' in part
          ? `\`${part.code}\``
          : `[${part.text}](${part.href})`
    )
    .join('')

export type ReleaseMarkdownOptions = {
  resolve: (href: string) => string
  formatDate: (date: string) => string
}

/** One release in markdown: its headline, versions, highlights, and every change in full. */
export function releaseMarkdown(
  view: ReleaseView,
  changes: Change[],
  { resolve, formatDate }: ReleaseMarkdownOptions,
  depth = 2
): string {
  const { title, summary } = view.headlines.all
  const when = view.pending
    ? 'Not on npm yet.'
    : view.date
      ? `Released ${formatDate(view.date)}.`
      : ''
  const versions = andList(
    view.versions.map(({ label, version, href }) =>
      version && href ? `[${label} ${version}](${href})` : label
    )
  )
  const highlights = view.cards.map((card) => {
    const description = inlineMarkdown(card.description).replace(
      /(?<=[^.!?])$/,
      '.'
    )
    const link = card.href ? ` See [${card.title}](${resolve(card.href)}).` : ''
    return `- **${card.title}**${card.breaking ? ' (breaking)' : ''}${description ? `: ${description}` : '.'}${link}`
  })
  return [
    `${'#'.repeat(depth)} ${title}`,
    [when, view.pending ? `Goes to ${versions}.` : versions]
      .filter(Boolean)
      .join(' '),
    summary,
    depth > 1 && `[This release on its own page](${resolve(view.href)})`,
    ...(highlights.length > 0
      ? [`${'#'.repeat(depth + 1)} Highlights`, highlights.join('\n')]
      : []),
    changesMarkdown(changes, resolve, depth + 1)
  ]
    .filter(Boolean)
    .join('\n\n')
}

/** The changes behind a view, for its markdown. */
export function changesOf(history: ReleaseHistory, slug: string): Change[] {
  if (slug === UNRELEASED_SLUG) return history.unreleased.changes
  return history.releases.find((release) => release.id === slug)?.changes ?? []
}

/** The changelog page's history as markdown, for its markdown copy. */
export function releaseHistoryMarkdown(
  history: ReleaseHistory,
  releases: ReleaseView[],
  options: ReleaseMarkdownOptions
): string {
  return releases
    .map((view) =>
      releaseMarkdown(view, changesOf(history, view.slug), options)
    )
    .join('\n\n')
}
