import { ArrowUpRightIcon } from '@phosphor-icons/react/ssr'

import { RelatedLinks } from '@/components/RelatedLinks'
import {
  type Change,
  type ChangeKind,
  type PackageVersion,
  byKind,
  getReleaseHistory
} from '@/lib/releases'

import { Badge } from '@oztix/roadie-components/badge'
import { Button } from '@oztix/roadie-components/button'
import { Collapsible } from '@oztix/roadie-components/collapsible'
import { DateTime } from '@oztix/roadie-components/date-time'

import { ChangeDetails, ChangeSummary } from './ChangeMarkdown'

type Intent = 'success' | 'info' | 'warning' | 'danger' | 'neutral'

export const KIND_INTENTS: Record<ChangeKind, Intent> = {
  new: 'success',
  changed: 'info',
  deprecated: 'warning',
  removed: 'danger',
  fixed: 'neutral'
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

export function PackageVersions({ packages }: { packages: PackageVersion[] }) {
  return (
    <ul className='flex flex-wrap gap-2' aria-label='Package versions'>
      {packages.map(({ name, label, version, href }) => (
        <li key={`${name}@${version}`}>
          <Button href={href} size='xs' emphasis='normal'>
            {label} {version}
            <ArrowUpRightIcon weight='bold' className='size-3' />
          </Button>
        </li>
      ))}
    </ul>
  )
}

/** Names joined with commas and a closing "and", with the Oxford comma from three. */
export function andList(names: string[]) {
  if (names.length < 3) return names.join(' and ')
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`
}

function ChangeItem({ change }: { change: Change }) {
  const links =
    change.pages.length > 0 ? (
      <RelatedLinks label='See' links={change.pages} />
    ) : null
  return (
    <li className='grid gap-1.5'>
      <p className='text-base text-strong'>
        <ChangeSummary markdown={change.summary} />
        {change.breaking ? (
          <>
            {' '}
            <Badge size='sm' intent='danger' emphasis='subtle'>
              Breaking
            </Badge>
          </>
        ) : null}
      </p>
      {change.details ? (
        <Collapsible className='grid gap-2'>
          <div className='flex flex-wrap items-center gap-x-4 gap-y-1'>
            {links}
            <Collapsible.Trigger className='text-sm text-subtle'>
              Details
            </Collapsible.Trigger>
          </div>
          <Collapsible.Panel hiddenUntilFound>
            <div className='grid gap-3 text-sm text-subtle'>
              <ChangeDetails markdown={change.details} />
            </div>
          </Collapsible.Panel>
        </Collapsible>
      ) : (
        links
      )}
    </li>
  )
}

function ChangeGroups({ changes }: { changes: Change[] }) {
  return byKind(changes).map(({ kind, title, changes: group }) => (
    <section key={kind} className='grid gap-3'>
      <h3 className='flex items-center gap-2 text-display-ui-5 text-strong'>
        {title}
        <Badge size='sm' intent={KIND_INTENTS[kind]} emphasis='subtle'>
          {group.length}
        </Badge>
      </h3>
      <ul className='grid gap-5'>
        {group.map((change) => (
          <ChangeItem key={change.id} change={change} />
        ))}
      </ul>
    </section>
  ))
}

/** Every release, newest first, with what's pending at the top. */
export function Changelog() {
  const { unreleased, releases } = getReleaseHistory()
  return (
    <div data-not-prose className='grid gap-12'>
      {unreleased.changes.length > 0 ? (
        <section className='grid gap-5'>
          <div className='grid gap-2'>
            <h2 id='unreleased' className='text-display-ui-3 text-strong'>
              Unreleased
            </h2>
            <p className='text-subtle'>
              Merged and waiting for the next release, so nothing here is on npm
              yet. It goes to{' '}
              {andList(unreleased.packages.map(({ label }) => label))}.
            </p>
          </div>
          <ChangeGroups changes={unreleased.changes} />
        </section>
      ) : null}
      {releases.map((release) => (
        <section key={release.id} className='grid gap-5'>
          <div className='grid gap-2'>
            <h2 id={release.id} className='text-display-ui-3 text-strong'>
              {release.date ? (
                <ReleaseDate date={release.date} />
              ) : (
                release.packages
                  .map(({ label, version }) => `${label} ${version}`)
                  .join(', ')
              )}
            </h2>
            <PackageVersions packages={release.packages} />
          </div>
          {release.changes.length > 0 ? (
            <ChangeGroups changes={release.changes} />
          ) : (
            <p className='text-subtle'>Dependency updates only.</p>
          )}
        </section>
      ))}
    </div>
  )
}
