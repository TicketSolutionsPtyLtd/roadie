import type { Icon } from '@phosphor-icons/react'
import {
  AlignBottomIcon,
  NewspaperIcon,
  SquareSplitHorizontalIcon,
  TicketIcon
} from '@phosphor-icons/react'
import type { JSONContent } from '@tiptap/core'

import { type EditorVariable, linkVariables } from '../schema/variables'
import { insertBlock } from './emailEditing'
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

function section(
  label: string,
  icon: Icon,
  content: JSONContent
): EditorInsertItem {
  return {
    label,
    icon,
    group: 'Sections',
    block: content,
    run: (editor) => editor.chain().focus().command(insertBlock(content)).run(),
    enabled: (editor) => editor.can().command(insertBlock(content))
  }
}

const header = section('Header', NewspaperIcon, {
  type: 'section',
  content: [
    heading(2, 'Headline'),
    paragraph(text('A line or two on what this email is about.'))
  ]
})

const eventSection = section('Event', TicketIcon, {
  type: 'section',
  content: event
})

const twoEvents = section('Two events', SquareSplitHorizontalIcon, {
  type: 'columns',
  content: [
    { type: 'column', content: event },
    { type: 'column', content: event }
  ]
})

const footer = (unsubscribe: string) =>
  section('Footer', AlignBottomIcon, {
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
  })

const isUnsubscribe = ({ key, label }: EditorVariable) =>
  /unsubscribe/i.test(`${key} ${label}`)

/**
 * Ready-made email sections for the Blocks drawer. The footer shows only with
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
    ...(unsubscribe ? [footer(unsubscribe.key)] : [])
  ]
}
