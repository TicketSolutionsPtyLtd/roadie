import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MarketingBlocksProvider } from '../Provider'
import { BlockRoot } from './BlockRoot'

function Page({ onBlockEvent }: { onBlockEvent: () => void }) {
  return (
    <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
      <div style={{ height: '200vh' }} />
      <BlockRoot
        block='statement'
        variant='one'
        preset='statement'
        position={2}
        aria-label='Statement'
      >
        <div style={{ height: '400px' }} />
      </BlockRoot>
    </MarketingBlocksProvider>
  )
}

// Resolves once the browser has run an intersection check of the element in its current spot.
const nextIntersection = (element: Element) =>
  new Promise((done) => {
    const observer = new IntersectionObserver(() => {
      observer.disconnect()
      done(null)
    })
    observer.observe(element)
  })

const seen = (spy: ReturnType<typeof vi.fn>) =>
  spy.mock.calls.filter(([event]) => event.action === 'view')

describe('BlockRoot views', () => {
  it('reports a view only once the block is half on screen, and only once', async () => {
    const onBlockEvent = vi.fn()
    const { container } = render(<Page onBlockEvent={onBlockEvent} />)
    const section = container.querySelector('section')!

    await nextIntersection(section)
    expect(seen(onBlockEvent)).toHaveLength(0)

    section.scrollIntoView({ block: 'center' })
    await vi.waitFor(() => expect(seen(onBlockEvent)).toHaveLength(1), {
      timeout: 2000
    })
    expect(onBlockEvent).toHaveBeenCalledWith({
      action: 'view',
      block: 'statement',
      variant: 'one',
      preset: 'statement',
      position: 2
    })

    window.scrollTo(0, 0)
    await nextIntersection(section)
    section.scrollIntoView({ block: 'center' })
    await nextIntersection(section)
    expect(seen(onBlockEvent)).toHaveLength(1)
  })
})
