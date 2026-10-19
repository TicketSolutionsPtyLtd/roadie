import { ArrowRightIcon } from '@phosphor-icons/react/ssr'

import { CHANGELOG_ROUTE, byKind, getReleaseHistory } from '@/lib/releases'

import { Badge } from '@oztix/roadie-components/badge'
import { Button } from '@oztix/roadie-components/button'

import { ChangeSummary } from './ChangeMarkdown'
import { KIND_INTENTS, ReleaseDate } from './Changelog'

const HIGHLIGHTS = 3

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? '' : 's'}`

/** The newest releases in brief: when, which versions, how many of each kind, and the first few changes. */
export function LatestReleases({ count }: { count: number }) {
  const { unreleased, releases } = getReleaseHistory()
  return (
    <ul className='grid divide-y divide-subtle border-y border-subtle'>
      {releases.slice(0, count).map((release) => {
        const groups = byKind(release.changes)
        const highlights = groups
          .flatMap((group) => group.changes)
          .slice(0, HIGHLIGHTS)
        const href = `${CHANGELOG_ROUTE}#${release.id}`
        return (
          <li
            key={release.id}
            className='grid gap-3 py-5 @md:grid-cols-[11rem_1fr] @md:gap-6'
          >
            <div className='grid content-start gap-1'>
              <h3 className='text-display-ui-6 text-strong'>
                {release.date ? <ReleaseDate date={release.date} /> : 'Release'}
              </h3>
              <p className='text-sm text-subtle'>
                {release.packages
                  .map(({ label, version }) => `${label} ${version}`)
                  .join(', ')}
              </p>
            </div>
            <div className='grid gap-3'>
              <ul className='flex flex-wrap gap-2' aria-label='Changes by kind'>
                {groups.map(({ kind, title, changes }) => (
                  <li key={kind}>
                    <Badge
                      size='sm'
                      intent={KIND_INTENTS[kind]}
                      emphasis='subtle'
                    >
                      {changes.length} {title.toLowerCase()}
                    </Badge>
                  </li>
                ))}
              </ul>
              <ul className='grid list-disc gap-2 pl-5'>
                {highlights.map((change) => (
                  <li key={change.id}>
                    <ChangeSummary markdown={change.summary} />
                  </li>
                ))}
              </ul>
              <Button
                href={href}
                size='sm'
                emphasis='subtler'
                className='justify-self-start'
              >
                {release.changes.length > highlights.length
                  ? `All ${plural(release.changes.length, 'change')}`
                  : 'Read the details'}
                <ArrowRightIcon weight='bold' className='size-4' />
              </Button>
            </div>
          </li>
        )
      })}
      {unreleased.changes.length > 0 ? (
        <li className='flex flex-wrap items-center gap-x-3 gap-y-1 py-4 text-sm'>
          <span className='text-subtle'>
            {plural(unreleased.changes.length, 'change')} merged for the next
            release.
          </span>
          <Button
            href={`${CHANGELOG_ROUTE}#unreleased`}
            size='sm'
            emphasis='subtler'
          >
            See what’s coming
            <ArrowRightIcon weight='bold' className='size-4' />
          </Button>
        </li>
      ) : null}
    </ul>
  )
}
