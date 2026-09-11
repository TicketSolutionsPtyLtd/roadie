import { CompassIcon } from '@phosphor-icons/react/ssr'

import { EmptyState } from '@oztix/roadie-components/empty-state'

export const metadata = {
  title: 'Foundations',
  description:
    'The principles and conventions every Roadie component builds on.'
}

export default function FoundationsPage() {
  return (
    <EmptyState>
      <EmptyState.IconTile>
        <CompassIcon weight='bold' />
      </EmptyState.IconTile>
      <EmptyState.Title>Choose a foundation</EmptyState.Title>
      <EmptyState.Description>
        Layout, colour, type, motion and the rest of the system&apos;s
        groundwork.
      </EmptyState.Description>
    </EmptyState>
  )
}
