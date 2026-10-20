import type { ReactNode } from 'react'

import { Image } from '@/components/Image'
import type { ReleaseCard as Highlight } from '@/lib/releases'

import { Badge } from '@oztix/roadie-components/badge'
import { Card } from '@oztix/roadie-components/card'

import { InlineText } from './InlineText'

function Thumbnail({ card, art }: { card: Highlight; art?: ReactNode }) {
  if (!card.image && !art) return null
  return (
    <span
      aria-hidden
      className='grid aspect-4/3 w-28 shrink-0 place-content-center overflow-hidden rounded-lg bg-normal'
    >
      {card.image ? (
        <Image
          src={card.image}
          alt=''
          width={192}
          height={144}
          className='size-full object-cover'
        />
      ) : (
        <span className='pointer-events-none grid scale-[0.5] place-items-center'>
          {art}
        </span>
      )}
    </span>
  )
}

/** A release highlight: what it is in a line or two, with its component's index art, opening its docs page. */
export function ReleaseCard({
  card,
  art,
  headingLevel = 3
}: {
  card: Highlight
  art?: ReactNode
  headingLevel?: 3 | 4
}) {
  const Heading = headingLevel === 3 ? 'h3' : 'h4'
  return (
    <li className='grid'>
      <Card emphasis='subtle'>
        <Card.Content className='grid grid-cols-[1fr_auto] items-center gap-4 p-4'>
          <div className='grid content-start gap-1'>
            <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
              <Heading className='text-display-ui-6 text-strong'>
                {card.href ? (
                  <Card.Link href={card.href}>{card.title}</Card.Link>
                ) : (
                  card.title
                )}
              </Heading>
              {card.breaking ? (
                <Badge size='sm' intent='danger' emphasis='subtle'>
                  Breaking
                </Badge>
              ) : null}
            </div>
            {card.description.length > 0 ? (
              <p className='line-clamp-2 text-sm text-subtle'>
                <InlineText inline={card.description} />
              </p>
            ) : null}
          </div>
          <Thumbnail card={card} art={art} />
        </Card.Content>
      </Card>
    </li>
  )
}

/** Highlights two to a row where there's room. Needs an `@container` ancestor. */
export function ReleaseCards({
  cards,
  art,
  label,
  headingLevel
}: {
  cards: Highlight[]
  art: Record<string, ReactNode>
  label: string
  headingLevel?: 3 | 4
}) {
  return (
    <ul aria-label={label} className='grid gap-3 @xl:grid-cols-2'>
      {cards.map((card) => (
        <ReleaseCard
          key={card.id}
          card={card}
          art={card.art ? art[card.art] : undefined}
          headingLevel={headingLevel}
        />
      ))}
    </ul>
  )
}
