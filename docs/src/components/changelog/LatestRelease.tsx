import Link from 'next/link'

import { ArrowRightIcon } from '@phosphor-icons/react/ssr'

import { getReleaseViews } from '@/lib/releases'

import { Button } from '@oztix/roadie-components/button'

import { releaseArt } from './Changelog'
import { ReleaseCards } from './ReleaseCard'
import { ReleaseDate, VersionChips } from './ReleaseParts'

const HIGHLIGHTS = 2

/** The newest release in brief: its title and summary, its first highlights, and what's waiting for the next one. */
export function LatestRelease() {
  const releases = getReleaseViews()
  const latest = releases.find((release) => !release.pending)
  const pending = releases.find((release) => release.pending)
  if (!latest) return null
  const { title, summary } = latest.headlines.all
  const cards = latest.cards.slice(0, HIGHLIGHTS)
  return (
    <div className='grid gap-5'>
      <div className='grid gap-2'>
        {latest.date ? (
          <p className='text-sm font-medium text-subtle'>
            <ReleaseDate date={latest.date} />
          </p>
        ) : null}
        <h3 className='text-display-ui-4 text-strong'>
          <Link
            href={latest.href}
            className='underline-offset-4 hover:underline'
          >
            {title}
          </Link>
        </h3>
        <p className='text-subtle'>{summary}</p>
        <div className='pt-1'>
          <VersionChips versions={latest.versions} />
        </div>
      </div>
      {cards.length > 0 ? (
        <ReleaseCards
          cards={cards}
          art={releaseArt([{ ...latest, cards }])}
          label={`Highlights of ${title}`}
          headingLevel={4}
        />
      ) : null}
      <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
        <Button href={latest.href} size='sm' emphasis='normal'>
          Read the release
          <ArrowRightIcon weight='bold' className='size-4' />
        </Button>
        {pending ? (
          <Link
            href={pending.href}
            className='text-sm text-subtle underline-offset-4 hover:underline'
          >
            Coming next: {pending.headlines.all.title}
          </Link>
        ) : null}
      </div>
    </div>
  )
}
