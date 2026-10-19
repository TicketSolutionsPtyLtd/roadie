import type { ReactNode } from 'react'

import Link from 'next/link'

import type { PageRelease, ReleaseRef } from '@/lib/releases'
import {
  PAGE_STATUSES,
  type PageStatus,
  STATUS_DETAILS,
  STATUS_ROUTE
} from '@/lib/status'

import { Badge } from '@oztix/roadie-components/badge'
import { DateTime } from '@oztix/roadie-components/date-time'
import { cn } from '@oztix/roadie-core/utils'

export type PageStatusInfo = { status: PageStatus; release: PageRelease }

const CHANGELOG = '/overview/changelog'
const UNRELEASED = `${CHANGELOG}/unreleased`

const linkClass = 'font-medium text-strong underline-offset-4 hover:underline'

function ReleaseLink({
  href,
  children
}: {
  href: string
  children: ReactNode
}) {
  return (
    <Link href={href} className={linkClass}>
      {children}
    </Link>
  )
}

const releaseHref = ({ id }: ReleaseRef) => `${CHANGELOG}/${id}`

function ReleaseName({ release }: { release: ReleaseRef }) {
  return (
    <>
      <ReleaseLink href={releaseHref(release)}>
        {release.label} {release.version}
      </ReleaseLink>
      {release.date ? (
        <>
          ,{' '}
          <DateTime
            at={new Date(`${release.date}T00:00:00Z`)}
            timeZone='UTC'
            dateStyle='medium'
            className='whitespace-nowrap'
          />
        </>
      ) : null}
    </>
  )
}

// Inline, with a no-break space after the dot, so no line ends on one.
function AfterDot({ children }: { children: ReactNode }) {
  return (
    <>
      {' '}
      <span aria-hidden>·</span>
      {'\u00a0'}
      {children}
    </>
  )
}

/**
 * A component page's status and releases, under the title. Alpha, beta, and
 * deprecated lead with a badge, the release that added the component, and
 * its latest change. Stable is the norm, so it reads as plain text beside
 * the latest release alone.
 */
export function PageStatusLine({
  status,
  release,
  className
}: PageStatusInfo & { className?: string }) {
  const { label, intent, flagged } = STATUS_DETAILS[status]
  const { added, updated, upcoming } = release
  const next =
    upcoming && added !== 'unreleased' ? (
      <span>
        <ReleaseLink href={UNRELEASED}>More in the next release</ReleaseLink>
      </span>
    ) : null

  if (!flagged) {
    const latest = updated ?? (typeof added === 'object' ? added : null)
    return (
      <p
        data-slot='page-status'
        className={cn('text-sm text-subtle', className)}
      >
        <Link
          href={STATUS_ROUTE}
          aria-label={`${label}: what this status means`}
          className='font-medium text-strong underline-offset-4 hover:underline'
        >
          {label}
        </Link>
        {added === 'unreleased' ? (
          <AfterDot>
            <ReleaseLink href={UNRELEASED}>Not released yet</ReleaseLink>
          </AfterDot>
        ) : latest ? (
          <AfterDot>
            <span>
              {latest === updated ? 'Updated' : 'Added'} in{' '}
              <ReleaseName release={latest} />
            </span>
          </AfterDot>
        ) : null}
        {next ? <AfterDot>{next}</AfterDot> : null}
      </p>
    )
  }

  return (
    <p
      data-slot='page-status'
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-subtle',
        className
      )}
    >
      <Link
        href={STATUS_ROUTE}
        aria-label={`${label}: what this status means`}
        className='is-interactive rounded-full'
      >
        <StatusBadge status={status} size='sm' />
      </Link>
      {added === 'unreleased' ? (
        <span>
          <ReleaseLink href={UNRELEASED}>Not released yet</ReleaseLink>
        </span>
      ) : added ? (
        <span>
          Added in{' '}
          <ReleaseLink href={releaseHref(added)}>
            {added.label} {added.version}
          </ReleaseLink>
        </span>
      ) : null}
      {updated ? (
        <span>
          Updated in <ReleaseName release={updated} />
        </span>
      ) : null}
      {next}
    </p>
  )
}

function StatusBadge({ status, size }: { status: PageStatus; size?: 'sm' }) {
  const { label, intent } = STATUS_DETAILS[status]
  return (
    <Badge size={size} intent={intent} emphasis='subtle'>
      {label}
    </Badge>
  )
}

/** The navigation's badge for an alpha, beta, or deprecated page. */
export function navBadge(status: PageStatus | undefined) {
  if (!status || !STATUS_DETAILS[status].flagged) return undefined
  return <StatusBadge status={status} />
}

/** Each status as its badge, with what it means. */
export function StatusKey() {
  return (
    <dl
      data-not-prose
      data-slot='status-key'
      className='grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3'
    >
      {PAGE_STATUSES.map((status) => (
        <div
          key={status}
          data-twin-row
          className='col-span-2 grid grid-cols-subgrid items-center'
        >
          <dt data-twin-cell className='flex'>
            <StatusBadge status={status} />
          </dt>
          <dd data-twin-cell className='text-subtle'>
            {STATUS_DETAILS[status].summary}
          </dd>
        </div>
      ))}
    </dl>
  )
}
