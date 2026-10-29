import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CardGrid, type CardGridItem, type CardGridPreset } from '.'
import { MarketingBlocksProvider } from '../Provider'
import { axeViolations, photo, withBrowserPage } from '../_test/browser'

withBrowserPage()

const items: CardGridItem[] = [
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

function Block({
  preset,
  width,
  count = 4
}: {
  preset: CardGridPreset
  width: number
  count?: number
}) {
  return (
    <div style={{ width }}>
      <CardGrid preset={preset} title='Section' items={items.slice(0, count)} />
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

describe('CardGrid columns', () => {
  it.each<[CardGridPreset, number, number]>([
    ['illustrated-cards', 3, 3],
    ['marked-cards', 4, 4],
    ['overlap-cards', 6, 3],
    ['portraits', 4, 4],
    ['lists', 3, 3],
    ['numbered-cards', 4, 4],
    ['link-cards', 3, 3]
  ])(
    '%s stacks on a phone and fills its columns on a desktop',
    (preset, count, desktop) => {
      const { unmount } = render(
        <Block preset={preset} width={375} count={count} />
      )
      expect(columns()).toBe(1)
      unmount()

      render(<Block preset={preset} width={1280} count={count} />)
      expect(columns()).toBe(desktop)
    }
  )

  it.each<[CardGridPreset, number]>([
    ['illustrated-cards', 1],
    ['marked-cards', 1],
    ['overlap-cards', 1],
    ['portraits', 2],
    ['lists', 1],
    ['numbered-cards', 1],
    ['link-cards', 2]
  ])('%s fits %i column(s) of at least 15rem at 640px', (preset, expected) => {
    render(<Block preset={preset} width={640} count={4} />)

    expect(columns()).toBe(expected)
    expect(cards()[0]!.getBoundingClientRect().width).toBeGreaterThanOrEqual(
      240
    )
  })

  it.each<CardGridPreset>([
    'illustrated-cards',
    'marked-cards',
    'overlap-cards',
    'numbered-cards',
    'link-cards',
    'alternating-rows',
    'portraits',
    'lists'
  ])('keeps a %s card inside the block when its text won’t wrap', (preset) => {
    render(
      <div style={{ width: 375 }}>
        <CardGrid
          preset={preset}
          title='Section'
          items={[
            {
              ...items[0]!,
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
  })

  it('takes its columns from its own width, not the window’s', () => {
    render(<Block preset='marked-cards' width={600} />)

    expect(window.innerWidth).toBeGreaterThan(1280)
    expect(columns()).toBe(1)
  })

  it('sets services in two columns at a tablet’s width', () => {
    render(<Block preset='marked-cards' width={800} />)

    expect(columns()).toBe(2)
  })
})

describe('CardGrid features', () => {
  const alignment = () =>
    getComputedStyle(
      screen.getAllByRole('heading', { level: 3 })[0]!.parentElement!
    ).textAlign

  it('centres each card on a phone and starts it when the card is wide', () => {
    const { unmount } = render(
      <Block preset='illustrated-cards' width={375} count={3} />
    )
    expect(alignment()).toBe('center')
    unmount()

    render(<Block preset='illustrated-cards' width={900} count={3} />)
    expect(alignment()).toBe('start')
  })

  it('overlaps each image with its illustration', () => {
    render(<Block preset='illustrated-cards' width={375} count={1} />)

    const image = screen.getByRole('img').getBoundingClientRect()
    const illustration = cards()[0]!
      .querySelector('svg')!
      .getBoundingClientRect()
    expect(illustration.top).toBeLessThan(image.bottom)
  })
})

describe('CardGrid alternating rows', () => {
  const sides = () =>
    cards().map((row) => {
      const text = within(row).getByRole('heading').getBoundingClientRect()
      const image = within(row).getByRole('img').getBoundingClientRect()
      if (image.top >= text.bottom) return 'below'
      return image.left > text.left ? 'right' : 'left'
    })

  it('sets each image below its text on a phone', () => {
    render(<Block preset='alternating-rows' width={375} count={3} />)

    expect(sides()).toEqual(['below', 'below', 'below'])
  })

  it('sets text beside its image from 640px', () => {
    render(<Block preset='alternating-rows' width={640} count={3} />)

    expect(sides()).toEqual(['left', 'right', 'left'])
  })

  it('alternates the image’s side on a desktop, starting on the left', () => {
    render(<Block preset='alternating-rows' width={1280} count={3} />)

    expect(sides()).toEqual(['left', 'right', 'left'])
  })

  it('runs its description the full width of the block', () => {
    render(
      <div style={{ width: 1280 }}>
        <CardGrid
          preset='alternating-rows'
          title='Our values'
          description={'We live our values in every event setup, every support call, and every challenge we solve together. '.repeat(
            3
          )}
          items={items.slice(0, 1)}
        />
      </div>
    )

    const list = cards()[0]!.parentElement!.getBoundingClientRect()
    const description = screen
      .getByText(/We live our values/)
      .getBoundingClientRect()
    expect(description.width).toBeGreaterThan(list.width - 2)
  })
})

describe('CardGrid images', () => {
  const ratio = (image: HTMLElement) => {
    const { width, height } = image.getBoundingClientRect()
    return Math.round((width / height) * 100) / 100
  }

  it.each<[CardGridPreset, number]>([
    ['illustrated-cards', 1.78],
    ['marked-cards', 1.33],
    ['overlap-cards', 1],
    ['alternating-rows', 1],
    ['portraits', 1]
  ])('crops a sized 4:3 photo to the %s shape', (preset, shape) => {
    render(<Block preset={preset} width={1280} count={1} />)

    expect(ratio(screen.getByRole('img'))).toBe(shape)
  })
})

describe('CardGrid portraits', () => {
  it('insets its raised panel inside the page’s padding, with rounded corners', () => {
    render(<Block preset='portraits' width={1440} count={4} />)

    const section = screen.getByRole('region')
    const panel = section.firstElementChild!
    expect(panel.getBoundingClientRect().left).toBeGreaterThan(
      section.getBoundingClientRect().left
    )
    expect(
      parseFloat(getComputedStyle(panel).borderTopLeftRadius)
    ).toBeGreaterThan(0)
  })
})

describe('CardGrid spacing', () => {
  const gap = (preset: CardGridPreset) => {
    render(<Block preset={preset} width={1280} count={1} />)
    const section = screen.getByRole('region').getBoundingClientRect()
    const heading = screen
      .getByRole('heading', { level: 2 })
      .getBoundingClientRect()
    return Math.round(heading.top - section.top)
  }

  it.each<CardGridPreset>([
    'marked-cards',
    'overlap-cards',
    'numbered-cards',
    'link-cards',
    'alternating-rows',
    'lists'
  ])('%s leaves the space above it to the page', (preset) => {
    expect(gap(preset)).toBe(0)
  })

  it.each<CardGridPreset>(['illustrated-cards', 'portraits'])(
    '%s pads its title inside its raised surface',
    (preset) => {
      expect(gap(preset)).toBeGreaterThan(0)
    }
  )
})

describe('CardGrid card links', () => {
  it.each<CardGridPreset>([
    'illustrated-cards',
    'marked-cards',
    'overlap-cards',
    'alternating-rows',
    'portraits',
    'lists',
    'numbered-cards',
    'link-cards'
  ])(
    'makes a linked %s card one hit area, from its image to its last line',
    (preset) => {
      render(
        <div style={{ width: 1280 }}>
          <CardGrid
            preset={preset}
            title='Section'
            items={[{ ...items[0]!, href: '#live-music' }]}
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
        [(left + right) / 2, (top + bottom) / 2]
      ] as const)
        expect(link.contains(document.elementFromPoint(x, y))).toBe(true)
    }
  )
})

describe('CardGrid views', () => {
  it('reports its view with the variant its preset picks', async () => {
    const onBlockEvent = vi.fn()
    render(
      <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
        <CardGrid
          preset='alternating-rows'
          position={4}
          title='Our values'
          items={items.slice(0, 1)}
        />
      </MarketingBlocksProvider>
    )

    await vi.waitFor(
      () =>
        expect(onBlockEvent).toHaveBeenCalledWith({
          action: 'view',
          block: 'card-grid',
          variant: 'list',
          preset: 'alternating-rows',
          position: 4
        }),
      { timeout: 2000 }
    )
  })
})

describe('CardGrid accessibility', () => {
  it.each<CardGridPreset>([
    'illustrated-cards',
    'marked-cards',
    'overlap-cards',
    'alternating-rows',
    'portraits',
    'lists',
    'numbered-cards',
    'link-cards'
  ])('%s has no axe violations', async (preset) => {
    const { container } = render(
      <main>
        <h1>Page</h1>
        <CardGrid
          preset={preset}
          eyebrow='How does Oztix partner?'
          title='We understand your industry'
          titleHighlight='industry'
          description='And what makes venues and events succeed.'
          items={items.slice(0, 3)}
        />
      </main>
    )

    expect(await axeViolations(container)).toEqual([])
  })
})
