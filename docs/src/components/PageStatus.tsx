import type { ReactNode } from 'react'

import Link from 'next/link'

import type { PageRelease, ReleaseRef } from '@/lib/releases'
import { type PageStatus, STATUS_DETAILS, STATUS_ROUTE } from '@/lib/status'

import { Badge } from '@oztix/roadie-components/badge'
import { DateTime } from '@oztix/roadie-components/date-time'

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
          />
        </>
      ) : null}
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
        className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-subtle ${className ?? ''}`}
      >
        <Link
          href={STATUS_ROUTE}
          aria-label={`${label}: what this status means`}
          className='font-medium text-strong underline-offset-4 hover:underline'
        >
          {label}
        </Link>
        {added === 'unreleased' ? (
          <>
            <span aria-hidden>·</span>
            <ReleaseLink href={UNRELEASED}>Not released yet</ReleaseLink>
          </>
        ) : latest ? (
          <>
            <span aria-hidden>·</span>
            <span>
              {latest === updated ? 'Updated' : 'Added'} in{' '}
              <ReleaseName release={latest} />
            </span>
          </>
        ) : null}
        {next ? <span aria-hidden>·</span> : null}
        {next}
      </p>
    )
  }

  return (
    <p
      data-slot='page-status'
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-subtle ${className ?? ''}`}
    >
      <Link
        href={STATUS_ROUTE}
        aria-label={`${label}: what this status means`}
        className='is-interactive rounded-full'
      >
        <Badge size='sm' intent={intent} emphasis='subtle'>
          {label}
        </Badge>
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

/** The navigation's badge for an alpha, beta, or deprecated page. */
export function navBadge(status: PageStatus | undefined) {
  if (!status || !STATUS_DETAILS[status].flagged) return undefined
  const { label, intent } = STATUS_DETAILS[status]
  return (
    <Badge intent={intent} emphasis='subtle'>
      {label}
    </Badge>
  )
}
