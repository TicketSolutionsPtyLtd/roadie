import { CubeIcon } from '@phosphor-icons/react/ssr'

import { EmptyState } from '@oztix/roadie-components/empty-state'

export const metadata = {
  title: 'Components',
  description:
    'Accessible React components built on Base UI, styled with intent and emphasis.'
}

export default function ComponentsPage() {
  return (
    <EmptyState>
      <EmptyState.IconTile>
        <CubeIcon weight='bold' />
      </EmptyState.IconTile>
      <EmptyState.Title>Select a component</EmptyState.Title>
      <EmptyState.Description>
        Browse the list, or filter it by name.
      </EmptyState.Description>
    </EmptyState>
  )
}
