import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Tabs } from '.'

function ThreeTabs(props: React.ComponentProps<typeof Tabs>) {
  return (
    <Tabs defaultValue='overview' {...props}>
      <Tabs.List>
        <Tabs.Tab value='overview'>Overview</Tabs.Tab>
        <Tabs.Tab value='details'>Details</Tabs.Tab>
        <Tabs.Tab value='history'>History</Tabs.Tab>
        <Tabs.Indicator />
      </Tabs.List>
      <Tabs.Panel value='overview'>Overview panel</Tabs.Panel>
      <Tabs.Panel value='details'>Details panel</Tabs.Panel>
      <Tabs.Panel value='history'>History panel</Tabs.Panel>
    </Tabs>
  )
}

describe('Tabs', () => {
  it('Tabs and Tabs.Root are the same component reference', () => {
    expect(Tabs).toBe(Tabs.Root)
  })

  it('renders the default value as active', () => {
    const { getByRole } = render(<ThreeTabs />)
    const overview = getByRole('tab', { name: 'Overview' })
    expect(overview).toHaveAttribute('data-active')
    const details = getByRole('tab', { name: 'Details' })
    expect(details).not.toHaveAttribute('data-active')
  })

  it('clicking a tab calls onValueChange and moves data-active', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    const { getByRole } = render(<ThreeTabs onValueChange={onValueChange} />)
    await user.click(getByRole('tab', { name: 'Details' }))
    expect(onValueChange).toHaveBeenCalledWith('details', expect.anything())
    expect(getByRole('tab', { name: 'Details' })).toHaveAttribute('data-active')
    expect(getByRole('tab', { name: 'Overview' })).not.toHaveAttribute(
      'data-active'
    )
  })

  it('renders only the active panel content', () => {
    const { getByText, queryByText } = render(<ThreeTabs />)
    expect(getByText('Overview panel')).toBeInTheDocument()
    expect(queryByText('Details panel')).not.toBeInTheDocument()
  })

  it('renders bare <Tabs> with sub-components', () => {
    const { getByRole } = render(
      <Tabs defaultValue='a'>
        <Tabs.List>
          <Tabs.Tab value='a'>A</Tabs.Tab>
          <Tabs.Tab value='b'>B</Tabs.Tab>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Panel value='a'>A panel</Tabs.Panel>
        <Tabs.Panel value='b'>B panel</Tabs.Panel>
      </Tabs>
    )
    expect(getByRole('tablist')).toBeInTheDocument()
  })

  it('places the expected data-slot on every leaf', () => {
    const { container } = render(<ThreeTabs />)
    expect(container.querySelector('[data-slot="tabs"]')).toBeInTheDocument()
    expect(
      container.querySelector('[data-slot="tabs-list"]')
    ).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="tabs-tab"]')).toHaveLength(3)
    expect(
      container.querySelector('[data-slot="tabs-indicator"]')
    ).toBeInTheDocument()
    // Inactive panels are unmounted by default, so only the active panel's
    // data-slot is present in the DOM.
    expect(container.querySelectorAll('[data-slot="tabs-panel"]')).toHaveLength(
      1
    )
  })

  it('does not select a disabled tab on click', async () => {
    const user = userEvent.setup()
    const { getByRole } = render(
      <Tabs defaultValue='a'>
        <Tabs.List>
          <Tabs.Tab value='a'>A</Tabs.Tab>
          <Tabs.Tab value='b' disabled>
            B
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value='a'>A</Tabs.Panel>
        <Tabs.Panel value='b'>B</Tabs.Panel>
      </Tabs>
    )
    await user.click(getByRole('tab', { name: 'B' }))
    expect(getByRole('tab', { name: 'A' })).toHaveAttribute('data-active')
    expect(getByRole('tab', { name: 'B' })).not.toHaveAttribute('data-active')
  })

  it('keyboard ArrowRight + Enter activates the next tab', async () => {
    const user = userEvent.setup()
    const { getByRole } = render(<ThreeTabs />)
    const overview = getByRole('tab', { name: 'Overview' })
    overview.focus()
    await user.keyboard('{ArrowRight}{Enter}')
    expect(getByRole('tab', { name: 'Details' })).toHaveAttribute('data-active')
  })

  it('direction="vertical" surfaces data-orientation on root and list', () => {
    const { container } = render(
      <Tabs defaultValue='a' direction='vertical'>
        <Tabs.List>
          <Tabs.Tab value='a'>A</Tabs.Tab>
          <Tabs.Tab value='b'>B</Tabs.Tab>
        </Tabs.List>
      </Tabs>
    )
    expect(container.querySelector('[data-slot="tabs"]')).toHaveAttribute(
      'data-orientation',
      'vertical'
    )
    expect(container.querySelector('[data-slot="tabs-list"]')).toHaveAttribute(
      'data-orientation',
      'vertical'
    )
  })

  it('intent prop applies the matching cascade class to the root', () => {
    const { container } = render(
      <Tabs defaultValue='a' intent='accent'>
        <Tabs.List>
          <Tabs.Tab value='a'>A</Tabs.Tab>
        </Tabs.List>
      </Tabs>
    )
    expect(container.querySelector('[data-slot="tabs"]')).toHaveClass(
      'intent-accent'
    )
  })

  it('emphasis defaults to "normal" when no emphasis prop is passed', () => {
    const { container } = render(<ThreeTabs />)
    const list = container.querySelector('[data-slot="tabs-list"]')!
    expect(list).toHaveClass('emphasis-subtle', 'rounded-full', 'p-1')
  })

  it('emphasis="normal" applies the segmented-track classes to the list', () => {
    const { container } = render(<ThreeTabs emphasis='normal' />)
    const list = container.querySelector('[data-slot="tabs-list"]')!
    expect(list).toHaveClass('emphasis-subtle', 'rounded-full', 'p-1')
  })

  it('emphasis="strong" applies the inverted pill indicator and inverts active text', () => {
    const { container } = render(<ThreeTabs emphasis='strong' />)
    const list = container.querySelector('[data-slot="tabs-list"]')!
    expect(list).toHaveClass('emphasis-subtle', 'rounded-full', 'p-1')
    const indicator = container.querySelector('[data-slot="tabs-indicator"]')!
    expect(indicator).toHaveClass('emphasis-strong', 'rounded-full')
    const activeTab = container.querySelector(
      '[data-slot="tabs-tab"][data-active]'
    )!
    expect(activeTab.className).toContain('data-[active]:text-inverted')
  })

  it('every tab carries the is-interactive utility', () => {
    const { container } = render(<ThreeTabs />)
    container.querySelectorAll('[data-slot="tabs-tab"]').forEach((tab) => {
      expect(tab).toHaveClass('is-interactive')
    })
  })

  it('emphasis="subtle" renders a ghost track (rounded, no background)', () => {
    const { container } = render(<ThreeTabs emphasis='subtle' />)
    const list = container.querySelector('[data-slot="tabs-list"]')!
    expect(list).toHaveClass('rounded-full', 'p-1')
    expect(list).not.toHaveClass('emphasis-subtle', 'border-b')
  })

  it('emphasis="subtler" applies the underline border to the list', () => {
    const { container } = render(<ThreeTabs emphasis='subtler' />)
    const list = container.querySelector('[data-slot="tabs-list"]')!
    expect(list).toHaveClass('border-b', 'border-subtle')
    expect(list).not.toHaveClass('emphasis-subtle', 'rounded-full')
  })

  it('emphasis="subtler" + direction="vertical" swaps the list border to the left edge', () => {
    const { container } = render(
      <Tabs defaultValue='a' emphasis='subtler' direction='vertical'>
        <Tabs.List>
          <Tabs.Tab value='a'>A</Tabs.Tab>
          <Tabs.Tab value='b'>B</Tabs.Tab>
          <Tabs.Indicator />
        </Tabs.List>
      </Tabs>
    )
    const list = container.querySelector('[data-slot="tabs-list"]')!
    // Border axis swap utilities are present so the static track follows
    // the indicator's coordinate flip in vertical mode.
    expect(list.className).toContain('data-[orientation=vertical]:border-b-0')
    expect(list.className).toContain(
      'data-[orientation=vertical]:border-l-subtle'
    )
  })

  it('direction="vertical" applies the column-flow utility to the list', () => {
    const { container } = render(
      <Tabs defaultValue='a' direction='vertical'>
        <Tabs.List>
          <Tabs.Tab value='a'>A</Tabs.Tab>
          <Tabs.Tab value='b'>B</Tabs.Tab>
        </Tabs.List>
      </Tabs>
    )
    const list = container.querySelector('[data-slot="tabs-list"]')!
    expect(list.className).toContain('data-[orientation=vertical]:flex-col')
  })

  it('disabled tab cannot be activated by keyboard either', async () => {
    // Click-disabled is covered by an earlier test. This one pins
    // down that pressing Enter while focused on a disabled tab also
    // does nothing — together they enforce the full disabled
    // contract through the wrapper.
    //
    // Whether arrow keys skip the disabled tab during navigation is
    // a Base UI roving-tabindex responsibility and is not asserted
    // here.
    const user = userEvent.setup()
    const { getByRole } = render(
      <Tabs defaultValue='a'>
        <Tabs.List>
          <Tabs.Tab value='a'>A</Tabs.Tab>
          <Tabs.Tab value='b' disabled>
            B
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>
    )
    getByRole('tab', { name: 'B' }).focus()
    await user.keyboard('{Enter}')
    expect(getByRole('tab', { name: 'A' })).toHaveAttribute('data-active')
    expect(getByRole('tab', { name: 'B' })).not.toHaveAttribute('data-active')
  })

  it('Tabs.Panel keepMounted keeps inactive panels in the DOM', () => {
    const { container } = render(
      <Tabs defaultValue='a'>
        <Tabs.List>
          <Tabs.Tab value='a'>A</Tabs.Tab>
          <Tabs.Tab value='b'>B</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value='a' keepMounted>
          A panel
        </Tabs.Panel>
        <Tabs.Panel value='b' keepMounted>
          B panel
        </Tabs.Panel>
      </Tabs>
    )
    expect(container.querySelectorAll('[data-slot="tabs-panel"]')).toHaveLength(
      2
    )
  })

  it('consumer renderBeforeHydration={false} mounts without overriding TypeScript or throwing', () => {
    // Roadie defaults `renderBeforeHydration` to `true` (override of
    // Base UI's default `false`). The SSR-semantic difference between
    // the two values is only observable during hydration of a
    // server-rendered tree — jsdom + RTL renders client-only, so we
    // can't differentiate the two outputs here. The contract this
    // test pins down is "the consumer override is forwarded through
    // the wrapper without a type or runtime error".
    const { container } = render(
      <Tabs defaultValue='a'>
        <Tabs.List>
          <Tabs.Tab value='a'>A</Tabs.Tab>
          <Tabs.Indicator renderBeforeHydration={false} />
        </Tabs.List>
      </Tabs>
    )
    expect(
      container.querySelector('[data-slot="tabs-indicator"]')
    ).toBeInTheDocument()
  })

  it('emphasis="strong" applies the inverted pill indicator', () => {
    const { container } = render(<ThreeTabs emphasis='strong' />)
    const indicator = container.querySelector('[data-slot="tabs-indicator"]')!
    expect(indicator).toHaveClass('emphasis-strong', 'rounded-full')
  })

  it.each(['strong', 'normal', 'subtle', 'subtler'] as const)(
    'emphasis="%s" mounts an indicator with Roadie motion tokens',
    (emphasis: 'strong' | 'normal' | 'subtle' | 'subtler') => {
      const { container } = render(<ThreeTabs emphasis={emphasis} />)
      const indicator = container.querySelector('[data-slot="tabs-indicator"]')!
      // The contract: the indicator is mounted and animates with
      // Roadie's shared duration/ease tokens. The global
      // prefers-reduced-motion reset in motion.css handles the a11y
      // case for every transition in the system, so no per-element
      // override is needed.
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveClass(
        'transition-all',
        'duration-slow',
        'ease-enter'
      )
    }
  )

  it('forwards custom className to the root', () => {
    const { container } = render(
      <Tabs defaultValue='a' className='custom-root'>
        <Tabs.List>
          <Tabs.Tab value='a'>A</Tabs.Tab>
        </Tabs.List>
      </Tabs>
    )
    expect(container.querySelector('[data-slot="tabs"]')).toHaveClass(
      'custom-root'
    )
  })

  it('size prop changes the height utility on each tab', () => {
    const { container } = render(<ThreeTabs size='lg' />)
    const tabs = container.querySelectorAll('[data-slot="tabs-tab"]')
    tabs.forEach((tab) => {
      expect(tab).toHaveClass('h-12')
    })
  })

  describe('Tabs.Tab href routing', () => {
    it('renders a button by default (no href)', () => {
      const { getByRole } = render(
        <Tabs defaultValue='a'>
          <Tabs.List>
            <Tabs.Tab value='a'>A</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      )
      const tab = getByRole('tab', { name: 'A' })
      expect(tab.tagName.toLowerCase()).toBe('button')
    })

    it('renders an anchor when href is set', () => {
      const { getByRole } = render(
        <Tabs defaultValue='a'>
          <Tabs.List>
            <Tabs.Tab value='a' href='/events'>
              Events
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
      )
      const tab = getByRole('tab', { name: 'Events' })
      expect(tab.tagName.toLowerCase()).toBe('a')
      expect(tab).toHaveAttribute('href', '/events')
    })

    it('does NOT emit Base UI nativeButton dev warning when href is set', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      render(
        <Tabs defaultValue='a'>
          <Tabs.List>
            <Tabs.Tab value='a' href='/events'>
              Events
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
      )
      const allCalls = [...warn.mock.calls, ...error.mock.calls]
        .map((c) => String(c[0]))
        .join('\n')
      expect(allCalls).not.toMatch(/nativeButton/i)
      warn.mockRestore()
      error.mockRestore()
    })

    it('arrow keys still move focus across mixed button/anchor tabs', async () => {
      const user = userEvent.setup()
      const { getByRole } = render(
        <Tabs defaultValue='a'>
          <Tabs.List>
            <Tabs.Tab value='a'>A</Tabs.Tab>
            <Tabs.Tab value='b' href='/b'>
              B
            </Tabs.Tab>
            <Tabs.Tab value='c'>C</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      )
      const a = getByRole('tab', { name: 'A' })
      const b = getByRole('tab', { name: 'B' })
      a.focus()
      expect(document.activeElement).toBe(a)
      await user.keyboard('{ArrowRight}')
      expect(document.activeElement).toBe(b)
      expect(b.tagName.toLowerCase()).toBe('a')
    })
  })
})
