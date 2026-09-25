import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Dashboard } from '.'
import { StatTile } from '../StatTile'

afterEach(() => vi.restoreAllMocks())

describe('Dashboard', () => {
  it('renders sections with headings', () => {
    render(
      <Dashboard>
        <Dashboard.Section title='At a glance' description='This week so far'>
          <StatTile label='Tickets sold' value={1842} />
        </Dashboard.Section>
      </Dashboard>
    )
    expect(
      screen.getByRole('heading', { level: 2, name: 'At a glance' })
    ).toBeInTheDocument()
    expect(screen.getByText('This week so far')).toBeInTheDocument()
  })

  it('warns in development when a row leaves a gap', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Dashboard>
        <Dashboard.Section title='Gappy'>
          <StatTile label='A' value={1} />
          <StatTile label='B' value={2} />
          <StatTile label='C' value={3} />
        </Dashboard.Section>
      </Dashboard>
    )
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[Roadie Dashboard] "Gappy"')
    )
  })
})
