import type { ReactNode } from 'react'

import Link from 'next/link'

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CaretRightIcon
} from '@phosphor-icons/react/ssr'
import type { RootContent } from 'mdast'
import { toString } from 'mdast-util-to-string'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

import { RelatedLinks } from '@/components/RelatedLinks'
import {
  CHANGELOG_ROUTE,
  type Change,
  type ReleaseView,
  byKind,
  changesOf,
  getReleaseHistory,
  getReleaseViews,
  toInline
} from '@/lib/releases'

import { Badge } from '@oztix/roadie-components/badge'
import { Card } from '@oztix/roadie-components/card'

import { releaseArt } from './Changelog'
import { InlineText } from './InlineText'
import { ReleaseCards } from './ReleaseCard'
import { ReleaseWhen, VersionChips } from './ReleaseParts'

const parser = unified().use(remarkParse)

// The markdown a node came from, so inline parsing sees it as written.
const sliceOf = (
  source: string,
  node: { position?: RootContent['position'] }
) => source.slice(node.position?.start.offset ?? 0, node.position?.end.offset)

function block(source: string, node: RootContent, index: number): ReactNode {
  const markdownOf = (child: RootContent) => sliceOf(source, child)
  switch (node.type) {
    case 'heading':
      return (
        <p key={index} className='font-semibold text-strong'>
          {toString(node)}
        </p>
      )
    case 'paragraph':
      return (
        <p key={index}>
          <InlineText inline={toInline(markdownOf(node))} />
        </p>
      )
    case 'list':
      return (
        <ul key={index} className='grid list-disc gap-1 pl-5'>
          {node.children.map((item, itemIndex) => (
            <li key={itemIndex}>
              <InlineText
                inline={toInline(
                  item.children.map((child) => markdownOf(child)).join(' ')
                )}
              />
            </li>
          ))}
        </ul>
      )
    case 'code':
      return (
        <pre
          key={index}
          className='overflow-x-auto rounded-lg bg-subtle p-3 text-sm'
        >
          <code>{node.value}</code>
        </pre>
      )
    default:
      return null
  }
}

/** The rest of a changeset: paragraphs, lists, and code. */
function ChangeDetails({ markdown }: { markdown: string }) {
  return parser
    .parse(markdown)
    .children.map((node, index) => block(markdown, node, index))
}

function ChangeEntry({ change }: { change: Change }) {
  const headline = (
    <>
      <InlineText inline={toInline(change.summary)} />
      {change.breaking ? (
        <>
          {' '}
          <Badge size='sm' intent='danger' emphasis='subtle'>
            Breaking
          </Badge>
        </>
      ) : null}
    </>
  )
  return (
    <li className='grid gap-1.5'>
      {change.details ? (
        <details className='group'>
          <summary className='is-interactive -mx-1 flex cursor-pointer list-none gap-2 rounded-md px-1 text-strong [&::-webkit-details-marker]:hidden'>
            <CaretRightIcon
              weight='bold'
              aria-hidden
              className='mt-0.5 size-4 shrink-0 text-subtle group-open:rotate-90'
            />
            <span>{headline}</span>
          </summary>
          <div className='grid gap-3 pt-2 pl-6 text-subtle'>
            <ChangeDetails markdown={change.details} />
          </div>
        </details>
      ) : (
        <p className='pl-6 text-strong'>{headline}</p>
      )}
      {change.pages.length > 0 ? (
        <RelatedLinks label='See' links={change.pages} className='pl-6' />
      ) : null}
    </li>
  )
}

function Neighbour({
  release,
  direction
}: {
  release: ReleaseView
  direction: 'Newer' | 'Older'
}) {
  return (
    <li className='grid'>
      <Card emphasis='normal'>
        <Card.Content className='grid gap-1 p-4'>
          <p className='flex items-center gap-1 text-sm text-subtle'>
            {direction === 'Newer' ? (
              <ArrowLeftIcon weight='bold' className='size-4' />
            ) : null}
            {direction}
            {direction === 'Older' ? (
              <ArrowRightIcon weight='bold' className='size-4' />
            ) : null}
          </p>
          <Card.Link href={release.href} className='font-semibold text-strong'>
            {release.headlines.all.title}
          </Card.Link>
        </Card.Content>
      </Card>
    </li>
  )
}

/** One release on a page of its own: every change, with its details a click away. */
export function ReleasePage({ slug }: { slug: string }) {
  const views = getReleaseViews()
  const at = views.findIndex((view) => view.slug === slug)
  const release = views[at]!
  const changes = changesOf(getReleaseHistory(), slug)
  const newer = views[at - 1]
  const older = views[at + 1]
  return (
    <div data-not-prose className='@container grid gap-10'>
      <header className='grid gap-3'>
        <p className='flex flex-wrap items-center gap-x-2 text-sm font-medium text-subtle'>
          <Link
            href={CHANGELOG_ROUTE}
            className='text-strong underline-offset-4 hover:underline'
          >
            Changelog
          </Link>
          <span aria-hidden>·</span>
          <ReleaseWhen release={release} />
        </p>
        <p className='text-lg text-subtle'>{release.headlines.all.summary}</p>
        <VersionChips versions={release.versions} linked />
      </header>
      {release.cards.length > 0 ? (
        <section aria-labelledby='highlights' className='grid gap-4'>
          <h2 id='highlights' className='text-display-ui-4 text-strong'>
            Highlights
          </h2>
          <ReleaseCards
            cards={release.cards}
            art={releaseArt([release])}
            label='Highlights'
          />
        </section>
      ) : null}
      {byKind(changes).map(({ kind, title, changes: group }) => (
        <section key={kind} aria-labelledby={kind} className='grid gap-4'>
          <div className='flex items-baseline gap-2'>
            <h2 id={kind} className='text-display-ui-4 text-strong'>
              {title}
            </h2>
            <span className='text-sm text-subtle'>{group.length}</span>
          </div>
          <ul className='grid gap-4 text-sm'>
            {group.map((change) => (
              <ChangeEntry key={change.id} change={change} />
            ))}
          </ul>
        </section>
      ))}
      {newer || older ? (
        <nav aria-label='More releases'>
          <ul className='grid gap-3 @md:grid-cols-2'>
            {newer ? <Neighbour release={newer} direction='Newer' /> : <li />}
            {older ? <Neighbour release={older} direction='Older' /> : null}
          </ul>
        </nav>
      ) : null}
    </div>
  )
}
