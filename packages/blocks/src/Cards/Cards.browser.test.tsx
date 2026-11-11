import type { ComponentType } from 'react'

import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'

import { Cards, type CardsItem, type CardsPreset, type CardsProps } from '.'
import { BlocksProvider } from '../Provider'
import {
  DESKTOP,
  axeViolations,
  fontSizeOf,
  photo,
  textAlignOf,
  withBrowserPage
} from '../_test/browser'
import { MINIMUM_LC, MODES, setMode, textContrast } from '../_test/contrast'
import { describeBlockFrame } from '../_test/frame'

withBrowserPage()

describeBlockFrame('cards', 'plain', Cards as ComponentType<never>, {
  cards: [{ title: 'Fast payouts' }]
})

const fixtures: CardsItem[] = [
  'Live music',
  'Venues',
  'Shows',
  'Sports',
  'Events',
  'Government'
].map((title, index) => ({
  title,
  subtitle: 'Festivals, tours, and concerts',
  description: 'We sell millions of tickets each year.',
  illustration: 'Ticket',
  image: photo(`${title} photo ${index + 1}`, 400, 300),
  points: ['ISO 9001:2015 certified', '99.99% SLA uptime']
}))

const withoutImages = fixtures.map(({ image: _image, ...item }) => item)

// Each preset, and the looks `plain` takes from its props and content.
const LOOKS = {
  plain: { preset: 'plain' },
  illustrated: { preset: 'plain', align: 'center', emphasis: 'raised' },
  steps: { preset: 'steps' },
  link: { preset: 'plain', itemEmphasis: 'raised', cards: withoutImages },
  'text-blocks': { preset: 'text-blocks' },
  overlap: { preset: 'overlap' },
  photo: { preset: 'photo' },
  lists: { preset: 'lists' }
} satisfies Record<string, Partial<CardsProps>>

type Look = keyof typeof LOOKS
const LOOK_NAMES = Object.keys(LOOKS) as Look[]

const propsOf = (look: Look, count = 4): CardsProps => {
  const props: Partial<CardsProps> = LOOKS[look]
  return {
    title: 'Section',
    ...props,
    cards: (props.cards ?? fixtures).slice(0, count)
  }
}

function Block({
  look,
  width,
  count = 4
}: {
  look: Look
  width: number
  count?: number
}) {
  return (
    <div style={{ width }}>
      <Cards {...propsOf(look, count)} />
    </div>
  )
}

const cards = () => {
  const [grid] = screen.getAllByRole('list')
  return within(grid!)
    .getAllByRole('listitem')
    .filter((card) => card.parentElement === grid)
}

const columns = () =>
  new Set(cards().map((card) => Math.round(card.getBoundingClientRect().left)))
    .size

describe('Cards columns', () => {
  it.each<[Look, number, number]>([
    ['illustrated', 3, 3],
    ['text-blocks', 4, 4],
    ['overlap', 6, 3],
    ['photo', 4, 4],
    ['lists', 3, 3],
    ['steps', 4, 4],
    ['link', 3, 3]
  ])(
    '%s stacks on a phone and fills its columns on a desktop',
    (look, count, desktop) => {
      const { unmount } = render(
        <Block look={look} width={375} count={count} />
      )
      expect(columns()).toBe(1)
      unmount()

      render(<Block look={look} width={1280} count={count} />)
      expect(columns()).toBe(desktop)
    }
  )

  it.each<[Look, number]>([
    ['illustrated', 1],
    ['text-blocks', 1],
    ['overlap', 1],
    ['photo', 2],
    ['lists', 2],
    ['steps', 1],
    ['link', 2]
  ])('%s fits %i column(s) of at least 15rem at 640px', (look, expected) => {
    render(<Block look={look} width={640} count={4} />)

    expect(columns()).toBe(expected)
    expect(cards()[0]!.getBoundingClientRect().width).toBeGreaterThanOrEqual(
      240
    )
  })

  it.each(LOOK_NAMES)(
    'keeps a %s card inside the block when its text won’t wrap',
    (look) => {
      const props = propsOf(look, 1)
      render(
        <div style={{ width: 375 }}>
          <Cards
            {...props}
            cards={[
              {
                ...props.cards[0]!,
                title: 'Unbreakable'.repeat(20),
                description: 'x'.repeat(200),
                points: ['y'.repeat(200)]
              }
            ]}
          />
        </div>
      )

      const block = screen.getByRole('region').getBoundingClientRect()
      expect(cards()[0]!.getBoundingClientRect().right).toBeLessThanOrEqual(
        block.right
      )
    }
  )

  it('takes its columns from its own width, not the window’s', () => {
    render(<Block look='text-blocks' width={600} />)

    expect(window.innerWidth).toBeGreaterThan(1280)
    expect(columns()).toBe(1)
  })

  it('sets services in two columns at a tablet’s width', () => {
    render(<Block look='text-blocks' width={800} />)

    expect(columns()).toBe(2)
  })
})

// A 1280px window less a classic, always-visible scrollbar.
describe('Cards at 1265px', () => {
  it.each<Look>(['text-blocks', 'steps', 'photo', 'lists'])(
    'keeps four %s cards of at least 15rem in one row',
    (look) => {
      render(<Block look={look} width={1265} count={4} />)

      expect(columns()).toBe(4)
      for (const card of cards())
        expect(card.getBoundingClientRect().width).toBeGreaterThanOrEqual(240)
    }
  )

  it('keeps four text-blocks cards in one row on a contained surface', () => {
    render(
      <div style={{ width: 1265 }}>
        <Cards {...propsOf('text-blocks')} emphasis='raised' contained />
      </div>
    )

    expect(columns()).toBe(4)
  })
})

// Four 15rem cards and three gap-12 gaps first fit inside a band's padding at 1216px.
describe('Cards four-across edge', () => {
  it.each<Look>(['text-blocks', 'steps'])(
    'sets four %s cards of at least 15rem across from 1216px',
    (look) => {
      const { unmount } = render(<Block look={look} width={1215} count={4} />)
      expect(columns()).toBeLessThan(4)
      unmount()

      render(<Block look={look} width={1216} count={4} />)
      expect(columns()).toBe(4)
      for (const card of cards())
        expect(card.getBoundingClientRect().width).toBeGreaterThanOrEqual(240)
    }
  )
})

describe('Cards lists', () => {
  it.each([
    [768, 2],
    [1024, 3]
  ])(
    'wraps six lists into columns of at least 15rem at %ipx',
    (width, expected) => {
      render(<Block look='lists' width={width} count={6} />)

      expect(columns()).toBe(expected)
      for (const card of cards())
        expect(card.getBoundingClientRect().width).toBeGreaterThanOrEqual(240)
    }
  )
})

describe('Cards long words', () => {
  it('keeps its heading inside the block on a phone', () => {
    render(
      <div style={{ width: 375 }}>
        <Cards
          preset='text-blocks'
          title={'Ticketverkaufsplattformen'.repeat(3)}
          description={'Ticketverkaufsplattformen'.repeat(3)}
          cards={fixtures.slice(0, 1)}
        />
      </div>
    )

    const block = screen.getByRole('region').getBoundingClientRect()
    const heading = screen.getByRole('heading', { level: 2 })
    expect(
      heading.parentElement!.parentElement!.getBoundingClientRect().right
    ).toBeLessThanOrEqual(block.right)
    expect(heading.getBoundingClientRect().right).toBeLessThanOrEqual(
      block.right
    )
  })
})

describe('Cards at 960px', () => {
  it.each<[Look, number, number]>([
    ['illustrated', 3, 3],
    ['lists', 3, 3]
  ])('fits %s in %i columns', (look, count, expected) => {
    render(<Block look={look} width={960} count={count} />)

    expect(columns()).toBe(expected)
  })

  it('fits illustrated cards two to a row from 42rem', () => {
    render(<Block look='illustrated' width={700} count={3} />)

    expect(columns()).toBe(2)
  })
})

describe('Cards illustrated cards', () => {
  const alignment = () =>
    getComputedStyle(
      screen.getAllByRole('heading', { level: 3 })[0]!.parentElement!
    ).textAlign

  it.each([375, 640, 960])(
    'centres each card under its image at %ipx',
    (width) => {
      render(<Block look='illustrated' width={width} count={3} />)

      expect(alignment()).toBe('center')
      const card = cards()[0]!
      const image = within(card).getByRole('img').getBoundingClientRect()
      const title = within(card).getByRole('heading').getBoundingClientRect()
      expect(title.top).toBeGreaterThanOrEqual(image.bottom - 1)
    }
  )

  it('overlaps each image with its illustration', () => {
    render(<Block look='illustrated' width={375} count={1} />)

    const image = screen.getByRole('img').getBoundingClientRect()
    const illustration = cards()[0]!
      .querySelector('svg')!
      .getBoundingClientRect()
    expect(illustration.top).toBeLessThan(image.bottom)
  })
})

describe('Cards align and size', () => {
  const heading = () => screen.getByRole('heading', { level: 2 })
  const cardTitle = () => screen.getAllByRole('heading', { level: 3 })[0]!

  it('centres the heading and starts the card text when align is unset', () => {
    render(<Block look='plain' width={1280} />)

    expect(textAlignOf(heading())).toBe('center')
    // Firefox and WebKit report start as left.
    expect(['start', 'left']).toContain(textAlignOf(cardTitle()))
  })

  it.each(['plain', 'text-blocks'] as const)(
    'starts the %s heading when align is start',
    (preset) => {
      render(
        <Cards preset={preset} align='start' title='Section' cards={fixtures} />
      )

      expect(textAlignOf(heading())).toBe('start')
    }
  )

  it('sets the title smaller at md, and again at sm', () => {
    const { rerender } = render(<Block look='plain' width={1280} />)
    const large = fontSizeOf(heading())

    rerender(
      <div style={{ width: 1280 }}>
        <Cards {...propsOf('plain')} size='md' />
      </div>
    )
    expect(fontSizeOf(heading())).toBeLessThan(large)
    const medium = fontSizeOf(heading())

    rerender(
      <div style={{ width: 1280 }}>
        <Cards {...propsOf('plain')} size='sm' />
      </div>
    )
    expect(fontSizeOf(heading())).toBeLessThan(medium)
  })
})

describe('Cards images', () => {
  const ratio = (image: HTMLElement) => {
    const { width, height } = image.getBoundingClientRect()
    return Math.round((width / height) * 100) / 100
  }

  it.each<[Look, number]>([
    ['plain', 2],
    ['steps', 2],
    ['text-blocks', 1.5],
    ['overlap', 1],
    ['photo', 1]
  ])('crops a sized 4:3 photo to the %s shape', (look, shape) => {
    render(<Block look={look} width={1280} count={1} />)

    expect(ratio(screen.getByRole('img'))).toBe(shape)
  })
})

describe('Cards photo', () => {
  it('insets its raised panel inside the page’s padding, with rounded corners', () => {
    render(<Block look='photo' width={1440} count={4} />)

    const section = screen.getByRole('region')
    const panel = section.querySelector('[data-slot="block-surface"]')!
    expect(panel.getBoundingClientRect().left).toBeGreaterThan(
      section.getBoundingClientRect().left
    )
    expect(
      parseFloat(getComputedStyle(panel).borderTopLeftRadius)
    ).toBeGreaterThan(0)
  })

  it('wraps a long subtitle rather than cutting it off', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(
      <Cards
        preset='photo'
        title='Leadership'
        cards={[
          {
            title: 'Mia Tran',
            subtitle: 'Head of Partnerships and Strategic Growth',
            image: photo('Mia Tran', 400, 400)
          }
        ]}
      />
    )

    const subtitle = screen.getByText(
      'Head of Partnerships and Strategic Growth'
    )
    expect(subtitle.scrollWidth).toBeLessThanOrEqual(subtitle.clientWidth)
    expect(getComputedStyle(subtitle).textOverflow).not.toBe('ellipsis')
  })
})

describe('Cards overlap cards', () => {
  const lightness = (element: Element) => {
    const [r, g, b] = getComputedStyle(element)
      .backgroundColor.match(/[\d.]+/g)!
      .map(Number)
    return getComputedStyle(element).backgroundColor.startsWith('oklch')
      ? r!
      : (r! + g! + b!) / 765
  }

  it.each(MODES)(
    'inverts its panels against the page in %s mode, with readable text',
    (mode) => {
      setMode(mode)
      onTestFinished(() => setMode('light'))
      render(
        <div className='bg-normal'>
          <Cards preset='overlap' title='Section' cards={fixtures} />
        </div>
      )

      const panel = screen.getByRole('heading', {
        name: 'Live music'
      }).parentElement!
      if (mode === 'light') expect(lightness(panel)).toBeLessThan(0.4)
      else expect(lightness(panel)).toBeGreaterThan(0.6)
      for (const text of within(panel).getAllByText(/Festivals|millions/))
        expect(textContrast(text), text.textContent!).toBeGreaterThanOrEqual(
          MINIMUM_LC.body
        )
    }
  )
})

describe('Cards spacing', () => {
  const gap = (look: Look) => {
    render(<Block look={look} width={1280} count={1} />)
    const section = screen.getByRole('region').getBoundingClientRect()
    const heading = screen
      .getByRole('heading', { level: 2 })
      .getBoundingClientRect()
    return Math.round(heading.top - section.top)
  }

  it.each<Look>(['plain', 'text-blocks', 'overlap', 'steps', 'link', 'lists'])(
    '%s leaves the space above it to the page',
    (look) => {
      expect(gap(look)).toBe(0)
    }
  )

  it.each<Look>(['illustrated', 'photo'])(
    '%s pads its title inside its raised surface',
    (look) => {
      expect(gap(look)).toBeGreaterThan(0)
    }
  )
})

const illustrationCentre = (card: HTMLElement): [number, number][] => {
  const drawing = card.querySelector('svg')
  if (!drawing) return []
  const { left, top, right, bottom } = drawing.getBoundingClientRect()
  return [[(left + right) / 2, (top + bottom) / 2]]
}

describe('Cards card links', () => {
  it.each(LOOK_NAMES)(
    'makes a linked %s card one hit area, from its image and illustration to its last line',
    (look) => {
      const props = propsOf(look, 1)
      render(
        <div style={{ width: 1280 }}>
          <Cards
            {...props}
            cards={[{ ...props.cards[0]!, href: '#live-music' }]}
          />
        </div>
      )

      const card = cards()[0]!
      const link = screen.getByRole('link', { name: 'Live music' })
      const { left, top, right, bottom } = card.getBoundingClientRect()
      for (const [x, y] of [
        // Inside the rounded corners, which clip the portrait card's hit area.
        [left + 12, top + 12],
        [right - 12, bottom - 12],
        [(left + right) / 2, (top + bottom) / 2],
        ...illustrationCentre(card)
      ] as const)
        expect(link.contains(document.elementFromPoint(x, y))).toBe(true)
    }
  )
})

describe('Cards linked tiles', () => {
  const scaleOnHover = async (preset: CardsPreset, href?: string) => {
    render(
      <div style={{ width: 1280 }}>
        <Cards
          preset={preset}
          title='Section'
          cards={[{ ...fixtures[0]!, href }]}
        />
      </div>
    )
    await userEvent.hover(cards()[0]!)
    return screen.getByRole('img')
  }

  it.each<CardsPreset>(['overlap', 'photo'])(
    'grows a linked %s photo on hover',
    async (preset) => {
      const image = await scaleOnHover(preset, '#live-music')

      await expect
        .poll(() => getComputedStyle(image).scale, { timeout: 2000 })
        .not.toMatch(/^(none|1)$/)
    }
  )

  it.each<CardsPreset>(['overlap', 'photo'])(
    'keeps an unlinked %s photo still on hover',
    async (preset) => {
      const image = await scaleOnHover(preset)

      await new Promise(requestAnimationFrame)
      expect(getComputedStyle(image).scale).toMatch(/^(none|1)$/)
    }
  )

  it('keeps a linked photo still when motion is reduced', async () => {
    await commands.reducedMotion(true)
    const image = await scaleOnHover('photo', '#live-music')

    await new Promise(requestAnimationFrame)
    expect(getComputedStyle(image).scale).toMatch(/^(none|1)$/)
  })
})

describe('Cards views', () => {
  it('reports its view with its preset', async () => {
    const onBlockEvent = vi.fn()
    render(
      <BlocksProvider onBlockEvent={onBlockEvent}>
        <Cards
          preset='photo'
          position={4}
          title='Our values'
          cards={fixtures.slice(0, 1)}
        />
      </BlocksProvider>
    )

    await vi.waitFor(
      () =>
        expect(onBlockEvent).toHaveBeenCalledWith({
          action: 'view',
          block: 'cards',
          preset: 'photo',
          position: 4
        }),
      { timeout: 2000 }
    )
  })
})

describe('Cards accessibility', () => {
  it.each(LOOK_NAMES)('%s has no axe violations', async (look) => {
    const { container } = render(
      <main>
        <h1>Page</h1>
        <Cards
          {...propsOf(look, 3)}
          eyebrow='How does Oztix partner?'
          title='We understand your industry'
          highlight='industry'
          description='And what makes venues and events succeed.'
        />
      </main>
    )

    expect(await axeViolations(container)).toEqual([])
  })
})

describe('Cards contrast', () => {
  const inMode = (mode: (typeof MODES)[number]) => {
    setMode(mode)
    onTestFinished(() => setMode('light'))
  }

  const lowContrast = (root: Element) =>
    [...root.querySelectorAll('*')].flatMap((element) => {
      const text = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent?.trim())
        .join('')
      if (!text) return []
      const style = getComputedStyle(element)
      const lc = textContrast(element)
      const size = parseFloat(style.fontSize)
      const large =
        size >= 24 || (size >= 18.6 && Number(style.fontWeight) >= 700)
      return lc >= (large ? MINIMUM_LC.large : MINIMUM_LC.body)
        ? []
        : [`${text.slice(0, 30)}: Lc ${Math.round(lc)}`]
    })

  const linked = fixtures.slice(0, 3).map((item, index) => ({
    ...item,
    href: index === 0 ? '#first' : undefined
  }))

  const PRESETS = LOOK_NAMES.filter((look) => look !== 'illustrated')
  const SECTIONS = [undefined, 'raised', 'normal', 'subtle', 'subtler'] as const
  const CARDS = [undefined, 'raised', 'subtle', 'subtler', 'normal'] as const
  const INTENTS = [
    'neutral',
    'brand',
    'brand-secondary',
    'brand-purple',
    'accent',
    'info',
    'success',
    'warning',
    'danger'
  ] as const
  const drawsOwnTiles = (look: Look) => look === 'overlap' || look === 'photo'

  type Case = {
    mode: (typeof MODES)[number]
    preset: Look
    emphasis?: (typeof SECTIONS)[number]
    itemEmphasis?: (typeof CARDS)[number]
    intent?: (typeof INTENTS)[number]
    itemIntent?: (typeof INTENTS)[number]
  }

  const surfaces: Case[] = MODES.flatMap((mode) =>
    PRESETS.flatMap((preset) =>
      SECTIONS.flatMap((emphasis) =>
        (drawsOwnTiles(preset) ? [undefined] : CARDS).map((itemEmphasis) => ({
          mode,
          preset,
          emphasis,
          itemEmphasis
        }))
      )
    )
  )

  // Intents on the defaults and on the most tinted surfaces.
  const intents: Case[] = MODES.flatMap((mode) =>
    PRESETS.flatMap((preset) =>
      INTENTS.flatMap((intent) =>
        (['default', 'subtle'] as const).flatMap((surface) => {
          const tint =
            surface === 'subtle'
              ? { emphasis: 'subtle' as const, itemEmphasis: 'subtle' as const }
              : {}
          return [
            { mode, preset, intent, ...tint },
            { mode, preset, itemIntent: intent, ...tint }
          ]
        })
      )
    )
  )

  const renderCase = ({
    preset,
    emphasis,
    itemEmphasis,
    intent,
    itemIntent
  }: Case) => {
    const props = propsOf(preset, 3)
    return render(
      <div className='bg-normal text-normal'>
        <Cards
          {...props}
          intent={intent}
          emphasis={emphasis}
          itemEmphasis={itemEmphasis}
          eyebrow='How does Oztix partner?'
          title='We understand your industry'
          highlight='industry'
          description='And what makes venues and events succeed.'
          cards={props.cards.map((item, index) => ({
            ...item,
            href: index === 0 ? '#first' : undefined,
            intent: itemIntent
          }))}
          actions={[{ label: 'See them all', href: '#all' }]}
        />
      </div>
    )
  }

  it.each(surfaces)(
    '$preset on a $emphasis section with $itemEmphasis cards reads in $mode mode',
    (testCase) => {
      inMode(testCase.mode)
      renderCase(testCase)

      expect(lowContrast(screen.getByRole('region'))).toEqual([])
    }
  )

  it.each(intents)(
    '$preset in block intent $intent or item intent $itemIntent on a $emphasis section reads in $mode mode',
    (testCase) => {
      inMode(testCase.mode)
      renderCase(testCase)

      expect(lowContrast(screen.getByRole('region'))).toEqual([])
    }
  )

  it.each(MODES)(
    'has no axe violations on every surface in %s mode',
    async (mode) => {
      inMode(mode)
      const { container } = render(
        <main className='bg-normal text-normal'>
          <h1>Page</h1>
          <Cards
            intent='brand'
            emphasis='subtle'
            itemEmphasis='normal'
            title='How can we help?'
            cards={linked}
          />
        </main>
      )

      expect(await axeViolations(container)).toEqual([])
    }
  )
})
