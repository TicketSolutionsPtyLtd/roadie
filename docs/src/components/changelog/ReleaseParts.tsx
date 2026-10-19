import type { ReactNode } from 'react'

import Link from 'next/link'

import { ArrowRightIcon, CaretDownIcon } from '@phosphor-icons/react/ssr'

import type {
  ChangeKind,
  Headline,
  ReleaseItem,
  ReleaseVersion,
  ReleaseView
} from '@/lib/releases'

import { Badge } from '@oztix/roadie-components/badge'
import { Button } from '@oztix/roadie-components/button'
import { DateTime } from '@oztix/roadie-components/date-time'

import { InlineText } from './InlineText'
import { ReleaseCards } from './ReleaseCard'

const KIND_LABELS: Record<ChangeKind, string> = {
  new: 'New',
  changed: 'Changed',
  deprecated: 'Deprecated',
  removed: 'Removed',
  fixed: 'Fixed'
}

/** A release date as Roadie formats it. Dates are days, so they read in UTC. */
export function ReleaseDate({ date }: { date: string }) {
  return (
    <DateTime
      at={new Date(`${date}T00:00:00Z`)}
      timeZone='UTC'
      dateStyle='medium'
    />
  )
}

/** When a release shipped, or that it hasn't yet. */
export function ReleaseWhen({ release }: { release: ReleaseView }) {
  if (release.pending)
    return (
      <Badge size='sm' intent='accent' emphasis='subtle'>
        Unreleased
      </Badge>
    )
  return release.date ? <ReleaseDate date={release.date} /> : null
}

export const versionLabel = ({ label, version }: ReleaseVersion) =>
  version ? `${label} ${version}` : label

export function VersionChips({
  versions,
  linked = false
}: {
  versions: ReleaseVersion[]
  linked?: boolean
}) {
  return (
    <ul aria-label='Package versions' className='flex flex-wrap gap-1.5'>
      {versions.map((version) => (
        <li key={version.package}>
          {linked && version.href ? (
            <Button href={version.href} size='xs' emphasis='normal'>
              {versionLabel(version)}
            </Button>
          ) : (
            <Badge size='sm' emphasis='normal'>
              {versionLabel(version)}
            </Badge>
          )}
        </li>
      ))}
    </ul>
  )
}

/** The order the list reads in, and so where it cuts off. */
const KIND_ORDER: ChangeKind[] = [
  'removed',
  'deprecated',
  'new',
  'changed',
  'fixed'
]

const sortItems = (items: ReleaseItem[]) =>
  [...items].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
  )

function KindLabel({ kind }: { kind: ChangeKind }) {
  if (kind === 'removed' || kind === 'deprecated')
    return (
      <Badge
        size='sm'
        intent={kind === 'removed' ? 'danger' : 'warning'}
        emphasis='subtle'
        className='justify-self-start'
      >
        {KIND_LABELS[kind]}
      </Badge>
    )
  return (
    <span className='text-xs text-subtle @md:text-sm'>{KIND_LABELS[kind]}</span>
  )
}

function Item({ item }: { item: ReleaseItem }) {
  return (
    <li className='grid items-baseline gap-x-3 gap-y-0.5 @md:grid-cols-[4.75rem_1fr]'>
      <KindLabel kind={item.kind} />
      <p>
        <InlineText inline={item.text} />
        {item.page ? (
          <>
            {' '}
            <Link
              href={item.page.href}
              className='inline-flex items-baseline gap-0.5 font-medium whitespace-nowrap text-subtle underline-offset-2 hover:underline'
            >
              {item.page.title}
              <ArrowRightIcon weight='bold' className='size-3 self-center' />
            </Link>
          </>
        ) : null}
      </p>
    </li>
  )
}

const SHOWN = 6

/** The smaller changes as a plain list, the first few showing and the rest behind a native disclosure. */
export function ReleaseItems({
  items,
  title,
  headingId,
  heading
}: {
  items: ReleaseItem[]
  title: string
  headingId: string
  heading: string
}) {
  const sorted = sortItems(items)
  // Hiding one or two saves less than the disclosure costs.
  const cut = sorted.length > SHOWN + 2 ? SHOWN : sorted.length
  const rest = sorted.slice(cut)
  return (
    <section aria-labelledby={headingId} className='grid gap-3'>
      <h3 id={headingId} className='text-display-ui-6 text-strong'>
        {heading}
      </h3>
      <ul className='grid gap-3 text-sm @md:gap-2'>
        {sorted.slice(0, cut).map((item) => (
          <Item key={item.id} item={item} />
        ))}
      </ul>
      {rest.length > 0 ? (
        <details className='group grid gap-2'>
          <summary className='is-interactive flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-semibold text-subtle [&::-webkit-details-marker]:hidden'>
            <CaretDownIcon
              weight='bold'
              className='size-4 group-open:rotate-180'
            />
            <span>
              {rest.length} more <span className='sr-only'>in {title}</span>
            </span>
          </summary>
          <ul className='grid gap-3 pt-2 text-sm @md:gap-2'>
            {rest.map((item) => (
              <Item key={item.id} item={item} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  )
}

/** A release's date, title, summary, and versions. */
export function ReleaseHeader({
  release,
  headline,
  titleId,
  linkTitle = true
}: {
  release: ReleaseView
  headline: Headline
  titleId: string
  linkTitle?: boolean
}) {
  return (
    <header className='grid gap-2'>
      <p className='text-sm font-medium text-subtle'>
        <ReleaseWhen release={release} />
      </p>
      <h2 id={titleId} className='text-display-ui-3 text-strong'>
        {linkTitle ? (
          <Link
            href={release.href}
            className='underline-offset-4 hover:underline'
          >
            {headline.title}
          </Link>
        ) : (
          headline.title
        )}
      </h2>
      <p className='text-lg text-subtle'>{headline.summary}</p>
      <div className='pt-1'>
        <VersionChips versions={release.versions} />
      </div>
    </header>
  )
}

/** One release on the changelog: its header, highlight cards, the rest as a list, and a link to its own page. */
export function ReleaseSummary({
  release,
  headline,
  art
}: {
  release: ReleaseView
  headline: Headline
  art: Record<string, ReactNode>
}) {
  const titleId = `${release.slug}-title`
  return (
    <div className='grid gap-6'>
      <ReleaseHeader release={release} headline={headline} titleId={titleId} />
      {release.cards.length > 0 ? (
        <ReleaseCards
          cards={release.cards}
          art={art}
          label={`Highlights of ${headline.title}`}
        />
      ) : null}
      {release.items.length > 0 ? (
        <ReleaseItems
          items={release.items}
          title={headline.title}
          headingId={`${release.slug}-more`}
          heading={
            release.cards.length > 0 ? 'Also in this release' : 'Changes'
          }
        />
      ) : null}
      <Button
        href={release.href}
        size='sm'
        emphasis='subtler'
        className='justify-self-start'
      >
        {release.pending
          ? 'Everything in the next release'
          : 'Full release notes'}
        <span className='sr-only'>: {headline.title}</span>
        <ArrowRightIcon weight='bold' className='size-4' />
      </Button>
    </div>
  )
}
