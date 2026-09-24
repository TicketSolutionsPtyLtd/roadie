import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Avatar, getInitials } from '.'
import { Image } from '../Image'

const slot = (name: string) =>
  document.querySelector<HTMLElement>(`[data-slot="${name}"]`)

describe('getInitials', () => {
  it.each([
    ['Mia Tran', 'MT'],
    ['  mia   van der tran ', 'MT'],
    ['Mia', 'M'],
    ['', ''],
    ['Élodie Ōkubo', 'ÉŌ'],
    ['😀 Smile', '😀S']
  ])('%j → %j', (name, initials) => {
    expect(getInitials(name)).toBe(initials)
  })
})

describe('Avatar', () => {
  it('is the same reference as Avatar.Root', () => {
    expect(Avatar).toBe(Avatar.Root)
  })

  it('renders a medium circle by default', () => {
    render(<Avatar name='Mia Tran' />)
    expect(slot('avatar')).toHaveClass('size-10', 'rounded-full')
  })

  it('maps sizes and gives square avatars a radius tier by size', () => {
    const { rerender } = render(<Avatar size='xs' shape='square' />)
    expect(slot('avatar')).toHaveClass('size-6', 'rounded-md')
    rerender(<Avatar size='md' shape='square' />)
    expect(slot('avatar')).toHaveClass('size-10', 'rounded-xl')
    rerender(<Avatar size='xl' shape='square' />)
    expect(slot('avatar')).toHaveClass('size-14', 'rounded-2xl')
  })

  it('derives initials from name and names the fallback', () => {
    render(<Avatar name='Mia Tran' />)
    const fallback = screen.getByRole('img', { name: 'Mia Tran' })
    expect(fallback).toBe(slot('avatar-fallback'))
    expect(fallback).toHaveTextContent('MT')
    expect(fallback).toHaveClass('emphasis-subtle')
  })

  it('lets alt name the avatar over name', () => {
    render(<Avatar name='Mia Tran' alt='Mia Tran, organiser' />)
    expect(
      screen.getByRole('img', { name: 'Mia Tran, organiser' })
    ).toHaveTextContent('MT')
  })

  it('stays decorative with an empty alt', () => {
    render(<Avatar name='Mia Tran' alt='' />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(slot('avatar-fallback')).toHaveTextContent('MT')
  })

  it('shows a user icon when there is no name', () => {
    render(<Avatar />)
    expect(slot('avatar-fallback')?.querySelector('svg')).toBeInTheDocument()
  })

  it('inherits intent unless one is set', () => {
    const { rerender } = render(<Avatar name='Mia Tran' />)
    expect(slot('avatar')?.className).not.toMatch(/intent-/)
    rerender(<Avatar name='Mia Tran' intent='accent' />)
    expect(slot('avatar')).toHaveClass('intent-accent')
  })

  it('keeps the image mounted and names it from alt, then name', () => {
    const { rerender } = render(<Avatar src='/mia.jpg' name='Mia Tran' />)
    expect(slot('avatar-image')).toHaveAttribute('src', '/mia.jpg')
    expect(slot('avatar-image')).toHaveAttribute('alt', 'Mia Tran')
    rerender(<Avatar src='/mia.jpg' name='Mia Tran' alt='' />)
    expect(slot('avatar-image')).toHaveAttribute('alt', '')
  })

  it('hides a failed image and keeps the fallback', () => {
    render(<Avatar src='/missing.jpg' name='Mia Tran' />)
    fireEvent.error(slot('avatar-image')!)
    expect(slot('avatar-image')).toHaveAttribute('data-error')
    expect(slot('avatar-image')).toHaveClass('data-[error]:invisible')
    expect(screen.getByRole('img', { name: 'Mia Tran' })).toHaveTextContent(
      'MT'
    )
  })

  it('drops the fallback once the image loads', () => {
    render(<Avatar src='/mia.jpg' name='Mia Tran' />)
    fireEvent.load(slot('avatar-image')!)
    expect(slot('avatar-fallback')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Mia Tran' })).toBe(
      slot('avatar-image')
    )
  })

  it('composes its parts', () => {
    render(
      <Avatar size='lg'>
        <Avatar.Image src='/mia.jpg' alt='Mia Tran' />
        <Avatar.Fallback>MT</Avatar.Fallback>
      </Avatar>
    )
    expect(slot('avatar')).toHaveClass('size-12')
    expect(slot('avatar-image')).toHaveClass('object-cover')
    expect(slot('avatar-fallback')).toHaveTextContent('MT')
  })

  it('renders through Roadie Image and still falls back on error', () => {
    render(
      <Avatar>
        <Avatar.Fallback>MT</Avatar.Fallback>
        <Avatar.Image
          render={<Image src='/mia.jpg' alt='Mia Tran' width={40} />}
        />
      </Avatar>
    )
    const img = screen.getByAltText('Mia Tran')
    expect(img).toHaveClass('object-cover')
    fireEvent.error(img)
    expect(img).toHaveAttribute('data-error')
    expect(slot('avatar-fallback')).toHaveTextContent('MT')
  })
})

describe('Avatar.Group', () => {
  it('overlaps its avatars and rings them in the page colour', () => {
    render(
      <Avatar.Group aria-label='Attendees'>
        <Avatar name='Mia Tran' />
        <Avatar name='Leo Park' />
      </Avatar.Group>
    )
    const group = screen.getByRole('group', { name: 'Attendees' })
    expect(group).toBe(slot('avatar-group'))
    expect(group).toHaveClass('[--avatar-ring:var(--intent-bg-normal)]')
    expect(group.className).toMatch(/-ms-/)
  })

  it('sizes and shapes every avatar in it', () => {
    render(
      <Avatar.Group size='sm' shape='square'>
        <Avatar name='Mia Tran' />
        <Avatar name='Leo Park' size='lg' />
        <Avatar.GroupCount count={12} />
      </Avatar.Group>
    )
    const [first, second] = document.querySelectorAll('[data-slot="avatar"]')
    expect(first).toHaveClass('size-8', 'rounded-lg')
    expect(second).toHaveClass('size-12')
    expect(slot('avatar-group-count')).toHaveClass('size-8', 'rounded-lg')
  })

  it('counts the rest as "+N", announced as "N more"', () => {
    render(<Avatar.GroupCount count={12} />)
    const count = screen.getByRole('img', { name: '12 more' })
    expect(count).toHaveTextContent('+12')
  })

  it('takes a custom label for the count', () => {
    render(<Avatar.GroupCount count={3} aria-label='3 more attendees' />)
    expect(
      screen.getByRole('img', { name: '3 more attendees' })
    ).toHaveTextContent('+3')
  })
})
