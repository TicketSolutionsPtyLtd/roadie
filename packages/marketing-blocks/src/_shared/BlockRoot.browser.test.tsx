import { type Ref, createRef } from 'react'

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MarketingBlocksProvider } from '../Provider'
import { BlockRoot } from './BlockRoot'

function Page({
  onBlockEvent,
  height = '400px',
  sectionRef
}: {
  onBlockEvent: () => void
  height?: string
  sectionRef?: Ref<HTMLElement>
}) {
  return (
    <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
      <div style={{ height: '200vh' }} />
      <BlockRoot
        ref={sectionRef}
        block='statement'
        variant='one'
        preset='statement'
        position={2}
        aria-label='Statement'
      >
        <div style={{ height }} />
      </BlockRoot>
      <div style={{ height: '200vh' }} />
    </MarketingBlocksProvider>
  )
}

const intersectionCheck = (element: Element) =>
  new Promise((done) => {
    const observer = new IntersectionObserver(() => {
      observer.disconnect()
      done(null)
    })
    observer.observe(element)
  })

// Two checks, because the block's own observer can be told a frame after a new one.
const nextIntersection = async (element: Element) => {
  await intersectionCheck(element)
  await intersectionCheck(element)
}

const seen = (spy: ReturnType<typeof vi.fn>) =>
  spy.mock.calls.filter(([event]) => event.action === 'view')

describe('BlockRoot views', () => {
  afterEach(() => {
    cleanup()
    window.scrollTo(0, 0)
  })

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

  it('reports a view of a block too tall to be half on screen once it fills half the screen', async () => {
    const onBlockEvent = vi.fn()
    const { container } = render(
      <Page onBlockEvent={onBlockEvent} height='300vh' />
    )
    const section = container.querySelector('section')!

    window.scrollTo(0, section.offsetTop - window.innerHeight * 0.8)
    await nextIntersection(section)
    expect(seen(onBlockEvent)).toHaveLength(0)

    section.scrollIntoView({ block: 'start' })
    await vi.waitFor(() => expect(seen(onBlockEvent)).toHaveLength(1), {
      timeout: 2000
    })
  })

  it('waits while a block is only partly on screen', async () => {
    const onBlockEvent = vi.fn()
    const { container } = render(<Page onBlockEvent={onBlockEvent} />)
    const section = container.querySelector('section')!

    // 30% of the 400px block shows at the bottom of the screen.
    window.scrollTo(0, section.offsetTop - window.innerHeight + 120)
    await nextIntersection(section)
    expect(seen(onBlockEvent)).toHaveLength(0)
  })

  it('reports a view of a block thirty screens tall once it reaches the middle of the screen', async () => {
    const onBlockEvent = vi.fn()
    const { container } = render(
      <Page onBlockEvent={onBlockEvent} height='3000vh' />
    )
    const section = container.querySelector('section')!

    window.scrollTo(0, section.offsetTop - window.innerHeight * 0.8)
    await nextIntersection(section)
    expect(seen(onBlockEvent)).toHaveLength(0)

    window.scrollTo(0, section.offsetTop + window.innerHeight * 10)
    await vi.waitFor(() => expect(seen(onBlockEvent)).toHaveLength(1), {
      timeout: 2000
    })
  })

  it('still reports views when the block passes its own ref', async () => {
    const onBlockEvent = vi.fn()
    const sectionRef = createRef<HTMLElement>()
    const { container } = render(
      <Page onBlockEvent={onBlockEvent} sectionRef={sectionRef} />
    )
    const section = container.querySelector('section')!
    expect(sectionRef.current).toBe(section)

    section.scrollIntoView({ block: 'center' })
    await vi.waitFor(() => expect(seen(onBlockEvent)).toHaveLength(1), {
      timeout: 2000
    })
  })
})
