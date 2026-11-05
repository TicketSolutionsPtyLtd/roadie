import type { ReactElement } from 'react'

import { render } from '@testing-library/react'
import { describe, expect, it, onTestFinished } from 'vitest'

import { AlternatingRows } from '../AlternatingRows'
import { CallToAction } from '../CallToAction'
import { Cards } from '../Cards'
import { FAQ } from '../FAQ'
import { Gallery } from '../Gallery'
import { Mosaic } from '../Mosaic'
import { RichText } from '../RichText'
import { SideBySide } from '../SideBySide'
import { Stats } from '../Stats'
import { Testimonial } from '../Testimonial'
import { photo, withBrowserPage } from '../_test/browser'
import { MINIMUM_LC, MODES, setMode, textContrast } from '../_test/contrast'
import type { BlockEmphasis, BlockIntent, ItemEmphasis } from './surface'

const actions = [
  { label: 'Talk to us', href: '/contact' },
  { label: 'Create my event', href: '/create' }
]
const heading = {
  eyebrow: 'For organisers',
  title: 'Sell more tickets with your partners',
  highlight: 'more tickets',
  description: 'List your events where your audience already spends time.'
}
const body = (
  <>
    <p>
      Read <a href='/guide'>the setup guide</a>, then run{' '}
      <code>oztix import</code>.
    </p>
    <h3>Australian owned</h3>
    <p>Our platform is hosted in Australia.</p>
  </>
)
const cards = [
  {
    title: 'You sell more tickets',
    subtitle: 'Reach more fans',
    description: 'Reach the largest event database in the country.',
    illustration: 'Ticket',
    image: photo('A festival crowd'),
    items: ['Fast payouts', 'Local support'],
    href: '/sell'
  },
  {
    title: 'Your events run smoothly',
    subtitle: 'Backed by specialists',
    description: 'Reliable systems back every decision.',
    illustration: 'Heart',
    image: photo('A ticket scan'),
    items: ['Event-day help', 'Scanning'],
    href: '/run'
  }
] as const
const figures = [
  { value: '33,000,000+', label: 'tickets sold', illustration: 'Ticket' },
  { value: '20+', label: 'years in ticketing', illustration: 'Heart' }
] as const
const quotes = [
  {
    quote: 'Their marketing sells tickets, plain and simple.',
    person: { name: 'Mia Tran', role: 'Head of Programming' },
    organisation: { name: 'Thimble Orbit Presents' }
  },
  {
    quote: 'Our crowd buys earlier now.',
    person: { name: 'Sam Okafor', role: 'Venue Manager' },
    organisation: { name: 'Kazoo Hollow Room' }
  }
]

type Look = {
  emphasis: BlockEmphasis
  intent: BlockIntent | undefined
  itemEmphasis?: ItemEmphasis
}

const BLOCKS: Record<string, (look: Look) => ReactElement> = {
  'alternating rows': (look) => (
    <AlternatingRows
      {...look}
      {...heading}
      rows={cards.map(({ title, subtitle, description, image }) => ({
        title,
        subtitle,
        description,
        image
      }))}
    />
  ),
  'call to action photo': (look) => (
    <CallToAction
      {...look}
      {...heading}
      body={body}
      actions={actions}
      image={photo('A crowd')}
    />
  ),
  'call to action centred': (look) => (
    <CallToAction
      {...look}
      {...heading}
      preset='centred'
      body={body}
      actions={actions}
    />
  ),
  ...Object.fromEntries(
    (
      ['plain', 'steps', 'text-blocks', 'overlap', 'photo', 'lists'] as const
    ).map((preset) => [
      `cards ${preset}`,
      (look: Look) => (
        <Cards
          {...look}
          {...heading}
          preset={preset}
          actions={actions}
          cards={[...cards]}
        />
      )
    ])
  ),
  faq: ({ itemEmphasis, ...look }) => (
    <FAQ
      {...look}
      itemEmphasis={itemEmphasis === 'raised' ? undefined : itemEmphasis}
      {...heading}
      actions={actions}
      questions={[
        { question: 'Does it cost anything?', answer: body },
        { question: 'Who can I talk to?', answer: <p>Email the team.</p> }
      ]}
    />
  ),
  ...Object.fromEntries(
    (['carousel', 'marquee', 'logos'] as const).map((preset) => [
      `gallery ${preset}`,
      (look: Look) => (
        <Gallery
          {...look}
          {...heading}
          preset={preset}
          images={[photo('One'), photo('Two'), photo('Three')]}
        />
      )
    ])
  ),
  mosaic: (look) => (
    <Mosaic
      {...look}
      {...heading}
      tiles={[
        {
          title: 'Ochre Kite Weekender',
          description: 'Presenting partner',
          size: 'md'
        },
        { title: 'Velvet Dingo Fest', description: 'Sponsor' },
        { title: 'Kazoo Hollow Room', description: 'Ticketing partner' }
      ]}
      logoTile={{ title: 'Also supporting', logos: [photo('Kerosene Pony')] }}
    />
  ),
  ...Object.fromEntries(
    (['statement', 'long-form'] as const).map((preset) => [
      `rich text ${preset}`,
      (look: Look) => (
        <RichText
          {...look}
          {...heading}
          preset={preset}
          body={body}
          actions={actions}
        />
      )
    ])
  ),
  'side by side image': (look) => (
    <SideBySide
      {...look}
      {...heading}
      body={body}
      actions={actions}
      image={photo('A crowd')}
    />
  ),
  'side by side stats': (look) => (
    <SideBySide
      {...look}
      {...heading}
      preset='stats'
      body={body}
      actions={actions}
      stats={{
        title: 'By the numbers',
        description: 'Since 2004',
        figures: [...figures]
      }}
    />
  ),
  stats: (look) => <Stats {...look} {...heading} stats={[...figures]} />,
  ...Object.fromEntries(
    (['quote', 'carousel'] as const).map((preset) => [
      `testimonial ${preset}`,
      (look: Look) => (
        <Testimonial {...look} {...heading} preset={preset} quotes={quotes} />
      )
    ])
  )
}

// Items that draw their own surface go back to the page's text colours on it.
const ITEM_BLOCKS = ['alternating rows', 'cards plain', 'cards lists', 'faq']
const ITEM_EMPHASES: ItemEmphasis[] = ['subtler', 'subtle', 'normal', 'raised']
for (const block of ITEM_BLOCKS)
  for (const itemEmphasis of ITEM_EMPHASES) {
    if (block === 'faq' && itemEmphasis === 'raised') continue
    BLOCKS[`${block} on ${itemEmphasis} items`] = (look) =>
      BLOCKS[block]!({ ...look, itemEmphasis })
  }

const INTENTS: (BlockIntent | undefined)[] = [
  undefined,
  'brand',
  'brand-secondary',
  'brand-purple',
  'accent',
  'success',
  'warning',
  'danger',
  'info'
]

// Every element that draws its own words, with the floor its size needs.
function textOf(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('*')].filter(
    (element) =>
      !element.closest('[aria-hidden=true], .sr-only, svg') &&
      element.checkVisibility() &&
      [...element.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim()
      )
  )
}

function unreadable(container: HTMLElement) {
  return textOf(container).flatMap((element) => {
    const large = parseFloat(getComputedStyle(element).fontSize) >= 24
    const lc = textContrast(element)
    const floor = large ? MINIMUM_LC.large : MINIMUM_LC.body
    return lc < floor
      ? [`${element.textContent!.trim()} (Lc ${lc.toFixed(0)})`]
      : []
  })
}

describe('Blocks on a strong or inverted surface', () => {
  withBrowserPage()

  it.each(
    Object.keys(BLOCKS).flatMap((block) =>
      MODES.flatMap((mode) =>
        (['strong', 'inverted'] as const).map((emphasis) => ({
          block,
          mode,
          emphasis
        }))
      )
    )
  )(
    'keeps every word of $block readable on $emphasis in $mode mode, for every intent',
    ({ block, mode, emphasis }) => {
      setMode(mode)
      onTestFinished(() => setMode('light'))
      const failures = INTENTS.flatMap((intent) => {
        const { container, unmount } = render(
          BLOCKS[block]!({ emphasis, intent })
        )
        const found = unreadable(container).map(
          (text) => `${intent ?? 'default'}: ${text}`
        )
        unmount()
        return found
      })
      expect(failures).toEqual([])
    }
  )
})
