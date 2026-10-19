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

const utcDate = (date: string) => (
  <DateTime
    at={new Date(`${date}T00:00:00Z`)}
    timeZone='UTC'
    dateStyle='medium'
  />
)

function Field({
  name,
  label,
  children
}: {
  name: string
  label: string
  children: ReactNode
}) {
  return (
    <div data-field={name} className='grid content-start gap-1'>
      <dt className='text-xs text-subtle'>{label}</dt>
      <dd className='grid gap-0.5 text-sm whitespace-nowrap text-strong'>
        {children}
      </dd>
    </div>
  )
}

function ReleaseValue({ release }: { release: ReleaseRef }) {
  return (
    <>
      <ReleaseLink href={releaseHref(release)}>
        {release.label} {release.version}
      </ReleaseLink>
      {release.date ? (
        <span className='text-subtle'>{utcDate(release.date)}</span>
      ) : null}
    </>
  )
}

function StatusFields({ status, release }: PageStatusInfo) {
  const { label, flagged } = STATUS_DETAILS[status]
  const { added, updated, upcoming } = release
  return (
    <>
      <Field name='status' label='Status'>
        <Link
          href={STATUS_ROUTE}
          aria-label={`${label}: what this status means`}
          className={
            flagged
              ? 'is-interactive justify-self-start rounded-full'
              : linkClass
          }
        >
          {flagged ? <StatusBadge status={status} size='sm' /> : label}
        </Link>
      </Field>
      {added ? (
        <Field name='added' label='Added'>
          {added === 'unreleased' ? (
            <ReleaseLink href={UNRELEASED}>Not released yet</ReleaseLink>
          ) : (
            <ReleaseValue release={added} />
          )}
        </Field>
      ) : null}
      {updated ? (
        <Field name='updated' label='Updated'>
          <ReleaseValue release={updated} />
        </Field>
      ) : null}
      {upcoming && added !== 'unreleased' ? (
        <Field name='next' label='Next release'>
          <ReleaseLink href={UNRELEASED}>Has changes</ReleaseLink>
        </Field>
      ) : null}
    </>
  )
}

/** A page's status, releases, and when its docs last changed, as labelled fields in a card under its title. */
export function PageMeta({
  status,
  updated,
  className
}: {
  status?: PageStatusInfo
  /** `YYYY-MM-DD`, in UTC, when the page last changed. */
  updated?: string
  className?: string
}) {
  if (!status && !updated) return null
  return (
    <dl
      data-slot='page-meta'
      className={cn(
        'flex flex-wrap gap-x-10 gap-y-4 rounded-2xl emphasis-subtle px-4 py-3',
        className
      )}
    >
      {status ? <StatusFields {...status} /> : null}
      {updated ? (
        <Field name='page-updated' label='Docs updated'>
          <span>{utcDate(updated)}</span>
        </Field>
      ) : null}
    </dl>
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
