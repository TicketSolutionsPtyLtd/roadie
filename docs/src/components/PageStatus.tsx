import type { ReactNode } from 'react'

import Link from 'next/link'

import type { PageRelease, ReleaseRef } from '@/lib/releases'
import { type PageStatus, STATUS_DETAILS, STATUS_ROUTE } from '@/lib/status'

import { Badge } from '@oztix/roadie-components/badge'
import { DateTime } from '@oztix/roadie-components/date-time'

export type PageStatusInfo = { status: PageStatus; release: PageRelease }

const CHANGELOG = '/overview/changelog'

function ReleaseLink({
  href,
  children
}: {
  href: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className='font-medium text-strong underline-offset-4 hover:underline'
    >
      {children}
    </Link>
  )
}

const releaseHref = ({ id }: ReleaseRef) => `${CHANGELOG}#${id}`

/** A component page's status, the release it arrived in, and its latest change, under the title. */
export function PageStatusLine({
  status,
  release,
  className
}: PageStatusInfo & { className?: string }) {
  const { label, intent } = STATUS_DETAILS[status]
  const { added, updated, upcoming } = release
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
          <ReleaseLink href={`${CHANGELOG}#unreleased`}>
            Not released yet
          </ReleaseLink>
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
          Updated in{' '}
          <ReleaseLink href={releaseHref(updated)}>
            {typeof added === 'object' && added?.label === updated.label
              ? updated.version
              : `${updated.label} ${updated.version}`}
          </ReleaseLink>
          {updated.date ? (
            <>
              ,{' '}
              <DateTime
                at={new Date(`${updated.date}T00:00:00Z`)}
                timeZone='UTC'
                dateStyle='medium'
              />
            </>
          ) : null}
        </span>
      ) : null}
      {upcoming && added !== 'unreleased' ? (
        <span>
          <ReleaseLink href={`${CHANGELOG}#unreleased`}>
            More in the next release
          </ReleaseLink>
        </span>
      ) : null}
    </p>
  )
}

/** The nav's badge for a page whose status the nav shows. */
export function navBadge(status: PageStatus | undefined) {
  if (!status || !STATUS_DETAILS[status].inNavigation) return undefined
  const { label, intent } = STATUS_DETAILS[status]
  return (
    <Badge intent={intent} emphasis='subtle'>
      {label}
    </Badge>
  )
}
