import type { Icon } from '@phosphor-icons/react'
import {
  AlignBottomIcon,
  ListBulletsIcon,
  NewspaperIcon,
  SquareSplitHorizontalIcon,
  TicketIcon
} from '@phosphor-icons/react'
import type { JSONContent } from '@tiptap/core'

import { type EditorVariable, linkVariables } from '../schema/variables'
import { TOP_LEVEL } from './blockActions'
import { dropEmptiedLine, insertBlockAfter } from './emailEditing'
import type { EditorInsertItem } from './insertItems'

const text = (value: string): JSONContent => ({ type: 'text', text: value })

const paragraph = (...content: JSONContent[]): JSONContent => ({
  type: 'paragraph',
  content
})

const heading = (level: number, value: string): JSONContent => ({
  type: 'heading',
  attrs: { level },
  content: [text(value)]
})

// Unlinked, so it sends as text until the author links it.
const getTickets: JSONContent = {
  type: 'button',
  content: [text('Get tickets')]
}

const event = [
  heading(3, 'Event name'),
  paragraph(text('Fri 14 Mar, 7:30pm · Venue, City')),
  getTickets
]

// Each goes after the caret's top-level block, so never inside a section.
function section(
  label: string,
  icon: Icon,
  content: JSONContent,
  keywords?: readonly string[]
): EditorInsertItem {
  const insert = insertBlockAfter(content, TOP_LEVEL)
  return {
    label,
    icon,
    group: 'Sections',
    keywords,
    block: content,
    containers: TOP_LEVEL,
    topLevel: 'always',
    insert: (chain) => chain.command(dropEmptiedLine).command(insert),
    enabled: (_editor, afterQuery) =>
      afterQuery().command(dropEmptiedLine).command(insert).run()
  }
}

const header = section(
  'Header',
  NewspaperIcon,
  {
    type: 'section',
    content: [
      heading(2, 'Headline'),
      paragraph(text('A line or two on what this email is about.'))
    ]
  },
  ['banner', 'hero']
)

const eventSection = section(
  'Event',
  TicketIcon,
  { type: 'section', content: event },
  ['tickets', 'cta', 'gig', 'show']
)

const act = (value: string): JSONContent => ({
  type: 'listItem',
  content: [paragraph(text(value))]
})

const lineup = section(
  'Lineup',
  ListBulletsIcon,
  {
    type: 'section',
    content: [
      heading(3, 'Lineup'),
      {
        type: 'bulletList',
        content: [act('Headliner, 9:30pm'), act('Support, 8pm')]
      }
    ]
  },
  ['acts', 'set times', 'schedule']
)

const twoEvents = section('Two events', SquareSplitHorizontalIcon, {
  type: 'columns',
  content: [
    { type: 'column', content: event },
    { type: 'column', content: event }
  ]
})

const footer = (unsubscribe: string) =>
  section(
    'Footer',
    AlignBottomIcon,
    {
      type: 'section',
      content: [
        { type: 'horizontalRule' },
        paragraph(
          text(
            'You’re getting this email because you signed up for news from us.'
          )
        ),
        paragraph({
          ...text('Unsubscribe'),
          marks: [{ type: 'link', attrs: { variable: unsubscribe } }]
        })
      ]
    },
    ['unsubscribe']
  )

const isUnsubscribe = ({ key, label }: EditorVariable) =>
  /unsubscribe/i.test(`${key} ${label}`)

/**
 * Ready-made email sections for the Blocks drawer and `/`. The footer shows only with
 * a link variable for the unsubscribe page, as a marketing email needs one.
 */
export function emailSections(
  variables?: readonly EditorVariable[]
): EditorInsertItem[] {
  const unsubscribe = linkVariables(variables).find(isUnsubscribe)
  return [
    header,
    eventSection,
    twoEvents,
    lineup,
    ...(unsubscribe ? [footer(unsubscribe.key)] : [])
  ]
}
