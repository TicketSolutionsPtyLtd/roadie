import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { MarketingBlocksProvider } from '../Provider'
import { BlockRoot } from './BlockRoot'

function Block({ position }: { position?: number }) {
  return (
    <BlockRoot
      block='hero'
      variant='media'
      preset='page-hero'
      position={position}
      aria-label='Hero'
    >
      <a href='/contact/sales'>Talk to us</a>
      <button type='button' aria-label='Play video'>
        ▶
      </button>
      <p>Not a control</p>
    </BlockRoot>
  )
}

describe('BlockRoot', () => {
  it('renders a section named by its data attributes', () => {
    render(<Block position={2} />)

    const section = screen.getByRole('region', { name: 'Hero' })
    expect(section).toHaveAttribute('data-block', 'hero')
    expect(section).toHaveAttribute('data-variant', 'media')
    expect(section).toHaveAttribute('data-preset', 'page-hero')
    expect(section).toHaveAttribute('data-position', '2')
  })

  it('reports a click on a link with its label and href', async () => {
    const onBlockEvent = vi.fn()
    render(
      <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
        <Block position={1} />
      </MarketingBlocksProvider>
    )

    await userEvent.click(screen.getByRole('link', { name: 'Talk to us' }))

    expect(onBlockEvent).toHaveBeenCalledWith({
      action: 'click',
      block: 'hero',
      variant: 'media',
      preset: 'page-hero',
      position: 1,
      label: 'Talk to us',
      href: '/contact/sales'
    })
  })

  it('reports a click on a button by its accessible name, with no href', async () => {
    const onBlockEvent = vi.fn()
    render(
      <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
        <Block />
      </MarketingBlocksProvider>
    )

    await userEvent.click(screen.getByRole('button', { name: 'Play video' }))

    expect(onBlockEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'click', label: 'Play video' })
    )
    expect(onBlockEvent.mock.calls[0]![0]).not.toHaveProperty('href')
  })

  it('falls back to the text when a control has an empty aria-label', async () => {
    const onBlockEvent = vi.fn()
    render(
      <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
        <BlockRoot block='hero' variant='media' preset='page-hero'>
          <a href='/about' aria-label=''>
            About us
          </a>
        </BlockRoot>
      </MarketingBlocksProvider>
    )

    await userEvent.click(screen.getByText('About us'))

    expect(onBlockEvent).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'About us' })
    )
  })

  it('ignores clicks that land on nothing interactive', async () => {
    const onBlockEvent = vi.fn()
    render(
      <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
        <Block />
      </MarketingBlocksProvider>
    )

    await userEvent.click(screen.getByText('Not a control'))

    expect(onBlockEvent).not.toHaveBeenCalled()
  })

  it('renders and takes clicks without a provider', async () => {
    render(<Block />)

    await userEvent.click(screen.getByRole('link', { name: 'Talk to us' }))

    expect(screen.getByRole('region', { name: 'Hero' })).toBeInTheDocument()
  })
})
