import { RocketLaunchIcon } from '@phosphor-icons/react/ssr'

import { EmptyState } from '@oztix/roadie-components/empty-state'

export const metadata = {
  title: 'Get started',
  description: 'Install Roadie and learn the ideas behind it.'
}

export default function GetStartedPage() {
  return (
    <EmptyState>
      <EmptyState.IconTile>
        <RocketLaunchIcon weight='bold' />
      </EmptyState.IconTile>
      <EmptyState.Title>Choose a guide</EmptyState.Title>
      <EmptyState.Description>
        How to install Roadie, the philosophy behind it, and moving to v2.
      </EmptyState.Description>
    </EmptyState>
  )
}
