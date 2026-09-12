import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { List } from '.'

const item = (title: string) =>
  screen.getByText(title).closest('[data-slot="list-item"]')

describe('List', () => {
  it('is the same reference as List.Root', () => {
    expect(List).toBe(List.Root)
  })

  it('renders an item with nothing but a title', () => {
    render(
      <List>
        <List.Item title='Notifications' />
      </List>
    )
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('renders leading, subtitle and trailing when given', () => {
    render(
      <List>
        <List.Item
          title='Valley Live'
          subtitle='3 organisations'
          leading={<span data-testid='leading' />}
          trailing={<span data-testid='trailing' />}
        />
      </List>
    )
    expect(screen.getByText('3 organisations')).toBeInTheDocument()
    expect(screen.getByTestId('leading')).toBeInTheDocument()
    expect(screen.getByTestId('trailing')).toBeInTheDocument()
    expect(item('Valley Live')).toBeTruthy()
  })

  describe('container alignment', () => {
    it('gives a row a plain 12px box that bleeds sideways, like a subtler Card', () => {
      render(
        <List>
          <List.Item title='Notifications' />
        </List>
      )
      expect(item('Notifications')).toHaveClass(
        'px-3',
        'group-data-[emphasis=subtler]/list:-mx-3'
      )
    })

    it('carries no width, so the pull widens the row on both sides', () => {
      render(
        <List>
          <List.Item title='Notifications' />
        </List>
      )
      expect(item('Notifications')).not.toHaveClass('w-full')
      expect(screen.getByRole('list')).toHaveClass('[&>li]:grid')
    })

    it('only pulls for subtler — a visible surface keeps its own box', () => {
      const { rerender } = render(
        <List>
          <List.Item title='Notifications' />
        </List>
      )
      expect(screen.getByRole('list')).toHaveAttribute(
        'data-emphasis',
        'subtler'
      )

      rerender(
        <List emphasis='subtle'>
          <List.Item title='Notifications' />
        </List>
      )
      expect(screen.getByRole('list')).toHaveAttribute(
        'data-emphasis',
        'subtle'
      )
    })
  })

  describe('emphasis', () => {
    const group = (container: HTMLElement) =>
      container.querySelector('[data-slot="list"]')

    it('defaults to ungrouped subtler rounded rows', () => {
      const { container } = render(
        <List>
          <List.Item title='Account' />
        </List>
      )
      expect(group(container)).toHaveAttribute('data-emphasis', 'subtler')
      expect(group(container)).not.toHaveClass('gap-0.5')
      expect(group(container)).not.toHaveClass('overflow-hidden')
      expect(item('Account')).toHaveClass('emphasis-subtler', 'rounded-xl')
    })

    const cases: Array<['subtle' | 'normal', string]> = [
      ['subtle', 'emphasis-subtle'],
      ['normal', 'emphasis-normal']
    ]

    it.each(cases)(
      'ungrouped, hands %s to the rows via data-emphasis',
      (emphasis: 'subtle' | 'normal', expected: string) => {
        const { container } = render(
          <List emphasis={emphasis}>
            <List.Item title='Account' />
          </List>
        )
        expect(group(container)).toHaveAttribute('data-emphasis', emphasis)
        expect(group(container)).not.toHaveClass(expected)
        expect(item('Account')).toHaveClass(
          `group-data-[emphasis=${emphasis}]/list:${expected}`
        )
      }
    )

    it.each(cases)(
      'contained, wears %s itself and leaves the rows transparent',
      (emphasis: 'subtle' | 'normal', expected: string) => {
        const { container } = render(
          <List contained emphasis={emphasis}>
            <List.Item title='Account' />
          </List>
        )
        expect(group(container)).toHaveAttribute('data-contained', emphasis)
        expect(group(container)).toHaveClass(
          `not-has-[>[data-slot=list-group]]:${expected}`,
          'not-has-[>[data-slot=list-group]]:rounded-xl',
          'not-has-[>[data-slot=list-group]]:overflow-hidden'
        )
        expect(group(container)).not.toHaveAttribute('data-emphasis')
        expect(item('Account')).toHaveClass('emphasis-subtler')
      }
    )

    it('leaves a contained subtler list without a fill class', () => {
      const { container } = render(
        <List contained emphasis='subtler'>
          <List.Item title='Account' />
        </List>
      )
      expect(group(container)).not.toHaveClass(
        'not-has-[>[data-slot=list-group]]:emphasis-subtle'
      )
      expect(group(container)).not.toHaveClass(
        'not-has-[>[data-slot=list-group]]:emphasis-normal'
      )
    })
  })

  describe('groups', () => {
    const grouped = (
      <List contained emphasis='subtle'>
        <List.Item title='Search' />
        <List.Group>
          <List.GroupTitle>Account</List.GroupTitle>
          <List.Item title='Profile' />
          <List.Item title='Security' />
        </List.Group>
      </List>
    )

    it('renders a group with a title without a key warning', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      render(grouped)
      expect(error).not.toHaveBeenCalled()
      error.mockRestore()
    })

    it('renders the title outside the section and the rows inside it', () => {
      const { container } = render(grouped)
      const group = container.querySelector('[data-slot="list-group"]')
      const section = group?.querySelector('[data-slot="list-section"]')

      expect(group?.tagName).toBe('LI')
      expect(section?.tagName).toBe('UL')
      expect(screen.getByText('Account')).toHaveAttribute(
        'data-slot',
        'list-group-title'
      )
      expect(section).not.toContainElement(screen.getByText('Account'))
      expect(section?.querySelectorAll('li')).toHaveLength(2)
    })

    it('keeps loose rows alongside groups as direct children', () => {
      const { container } = render(grouped)
      const root = container.querySelector('[data-slot="list"]')
      expect(root?.children).toHaveLength(2)
      expect(item('Search')?.closest('ul')).toBe(root)
    })

    it('hands the card to each group and keeps it off the root', () => {
      const { container } = render(grouped)
      const root = container.querySelector('[data-slot="list"]')
      const section = container.querySelector('[data-slot="list-section"]')

      // `not-has-*` disarms the root's card once a group is present.
      expect(root).toHaveClass(
        'not-has-[>[data-slot=list-group]]:emphasis-subtle'
      )
      expect(section).toHaveClass(
        'group-data-[contained=subtle]/list:emphasis-subtle',
        'group-data-[contained]/list:rounded-xl'
      )
    })
  })

  describe('divider', () => {
    it('renders an inset divider between items but not after the last', () => {
      const { container } = render(
        <List>
          <List.Item title='First' />
          <List.Item title='Last' />
        </List>
      )
      const dividers = container.querySelectorAll(
        '[data-slot="list-item-content"]'
      )
      expect(dividers).toHaveLength(2)
      dividers.forEach((d) =>
        expect(d).toHaveClass(
          'after:absolute',
          'after:h-px',
          'after:-bottom-px'
        )
      )
      const group = container.querySelector('[data-slot="list"]')
      expect(group).toHaveClass(
        '[&>li:last-child>*>[data-slot=list-item-content]]:after:bg-transparent'
      )
    })
  })

  describe('chevron', () => {
    const chevron = (title: string) => item(title)?.querySelector('svg')

    it('auto-shows for an href item', () => {
      render(
        <List>
          <List.Item title='Settings' href='/settings' />
        </List>
      )
      expect(chevron('Settings')).toBeTruthy()
    })

    it('is absent for a plain item', () => {
      render(
        <List>
          <List.Item title='Sign out' />
        </List>
      )
      expect(chevron('Sign out')).toBeNull()
    })

    it('can be forced on an onClick-only row with chevron', () => {
      render(
        <List>
          <List.Item title='Open' chevron />
        </List>
      )
      expect(chevron('Open')).toBeTruthy()
    })

    it('can be suppressed on a link with chevron={false}', () => {
      render(
        <List>
          <List.Item title='Docs' href='/docs' chevron={false} />
        </List>
      )
      expect(chevron('Docs')).toBeNull()
    })

    it('coexists with a trailing node — both render', () => {
      render(
        <List>
          <List.Item
            title='Tickets'
            href='/tickets'
            trailing={<span data-testid='badge'>3</span>}
          />
        </List>
      )
      expect(screen.getByTestId('badge')).toBeInTheDocument()
      expect(chevron('Tickets')).toBeTruthy()
    })
  })

  it('renders a button when there is no href', () => {
    const { container } = render(
      <List>
        <List.Item title='Sign out' />
      </List>
    )
    expect(container.querySelector('button')).toBeTruthy()
  })

  it('routes an internal href through the provider', () => {
    render(
      <List>
        <List.Item title='Tickets' href='/tickets' />
      </List>
    )
    const link = screen.getByRole('link', { name: /tickets/i })
    expect(link).toHaveAttribute('href', '/tickets')
    expect(link).not.toHaveAttribute('target')
  })

  it('renders an anchor for an external href', () => {
    render(
      <List>
        <List.Item title='Status' href='https://status.oztix.com.au' />
      </List>
    )
    const link = screen.getByRole('link', { name: /status/i })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  describe('subtitle', () => {
    it('describes a link row rather than naming it', () => {
      render(
        <List>
          <List.Item title='Tickets' subtitle='3 upcoming' href='/tickets' />
        </List>
      )
      const link = screen.getByRole('link')
      expect(link).toHaveAccessibleName('Tickets')
      expect(link).toHaveAccessibleDescription('3 upcoming')
    })

    it('describes a button row rather than naming it', () => {
      render(
        <List>
          <List.Item title='Account' subtitle='Profile, security, sign-in' />
        </List>
      )
      const button = screen.getByRole('button')
      expect(button).toHaveAccessibleName('Account')
      expect(button).toHaveAccessibleDescription('Profile, security, sign-in')
    })

    it('keeps the subtitle visible on the row', () => {
      render(
        <List>
          <List.Item title='Account' subtitle='Profile' />
        </List>
      )
      expect(screen.getByText('Profile')).toBeVisible()
    })

    it('leaves a row without a subtitle undescribed', () => {
      render(
        <List>
          <List.Item title='Account' />
        </List>
      )
      expect(screen.getByRole('button')).not.toHaveAttribute('aria-describedby')
    })
  })

  it('applies a distinct highlight and aria-current when current', () => {
    render(
      <List>
        <List.Item title='Valley Live' current />
      </List>
    )
    const row = item('Valley Live')
    expect(row).toHaveAttribute('aria-current', 'true')
    expect(row).toHaveClass('intent-accent', 'emphasis-subtle')
    // The more specific group emphasis would override the accent fill.
    expect(row).not.toHaveClass(
      'group-data-[emphasis=subtle]/list:emphasis-subtle'
    )
  })

  it('drops the hairlines that would cut into a filled row', () => {
    const { container } = render(
      <List>
        <List.Item title='First' />
        <List.Item title='Second' current />
      </List>
    )
    const group = container.querySelector('[data-slot="list"]')
    // `:has()` can't nest, so the row-above rule is split three ways.
    expect(group).toHaveClass(
      '[&>li:is(:hover,:has(>:is(:focus-visible,[aria-current])))>*>[data-slot=list-item-content]]:after:bg-transparent',
      '[&>li:has(+li:hover)>*>[data-slot=list-item-content]]:after:bg-transparent',
      '[&>li:has(+li_:focus-visible)>*>[data-slot=list-item-content]]:after:bg-transparent',
      '[&>li:has(+li_[aria-current])>*>[data-slot=list-item-content]]:after:bg-transparent'
    )
  })

  it('gaps the rows and drops every divider on a filled emphasis', () => {
    const { container } = render(
      <List emphasis='subtle'>
        <List.Item title='First' />
        <List.Item title='Second' />
      </List>
    )
    const group = container.querySelector('[data-slot="list"]')
    expect(group).toHaveClass(
      'gap-1',
      '[&_[data-slot=list-item-content]]:after:bg-transparent'
    )
  })

  describe('current', () => {
    it('marks a boolean current item with aria-current="true"', () => {
      render(
        <List>
          <List.Item title='Channel 10' current />
        </List>
      )
      expect(item('Channel 10')).toHaveAttribute('aria-current', 'true')
    })

    it('passes a token through to aria-current', () => {
      render(
        <List>
          <List.Item title='Button' href='/components/button' current='page' />
        </List>
      )
      expect(item('Button')).toHaveAttribute('aria-current', 'page')
    })

    it('omits aria-current when not current', () => {
      render(
        <List>
          <List.Item title='Personal' />
        </List>
      )
      expect(item('Personal')).not.toHaveAttribute('aria-current')
    })
  })

  describe('group association', () => {
    it('labels the group list with its title', () => {
      render(
        <List>
          <List.Group>
            <List.GroupTitle>Inputs</List.GroupTitle>
            <List.Item title='Button' />
          </List.Group>
        </List>
      )
      const title = screen.getByText('Inputs')
      const section = screen.getByRole('list', { name: 'Inputs' })
      expect(section).toHaveAttribute('aria-labelledby', title.id)
      expect(title.id).not.toBe('')
    })

    it('keeps a consumer id on the title and labels the section with it', () => {
      render(
        <List>
          <List.Group>
            <List.GroupTitle id='inputs-title'>Inputs</List.GroupTitle>
            <List.Item title='Button' />
          </List.Group>
        </List>
      )
      expect(screen.getByText('Inputs')).toHaveAttribute('id', 'inputs-title')
      expect(screen.getByRole('list', { name: 'Inputs' })).toHaveAttribute(
        'aria-labelledby',
        'inputs-title'
      )
    })

    it('insets the title to the rows’ text column, bleeding only for subtler', () => {
      render(
        <List>
          <List.Group>
            <List.GroupTitle>Inputs</List.GroupTitle>
            <List.Item title='Button' />
          </List.Group>
        </List>
      )
      expect(screen.getByText('Inputs')).toHaveClass(
        'px-3',
        'group-data-[emphasis=subtler]/list:-mx-3'
      )
    })

    it('renders the title as a heading by default', () => {
      render(
        <List>
          <List.Group>
            <List.GroupTitle>Inputs</List.GroupTitle>
          </List.Group>
        </List>
      )
      expect(
        screen.getByRole('heading', { level: 2, name: 'Inputs' })
      ).toBeInTheDocument()
    })

    it('changes the heading level with an element render', () => {
      render(
        <List>
          <List.Group>
            <List.GroupTitle render={<h3 />}>Inputs</List.GroupTitle>
            <List.Item title='Text field' />
          </List.Group>
        </List>
      )
      const heading = screen.getByRole('heading', { level: 3, name: 'Inputs' })
      expect(heading).toHaveAttribute('data-slot', 'list-group-title')
      expect(heading).toHaveClass('text-subtler')
      expect(screen.getByRole('list', { name: 'Inputs' })).toBeInTheDocument()
    })

    it('honours a function render', () => {
      render(
        <List>
          <List.Group>
            <List.GroupTitle render={(p) => <h4 {...p} />}>
              Inputs
            </List.GroupTitle>
          </List.Group>
        </List>
      )
      expect(
        screen.getByRole('heading', { level: 4, name: 'Inputs' })
      ).toBeInTheDocument()
    })
  })
})
