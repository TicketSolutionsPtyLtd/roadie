import { IconButton } from '@oztix/roadie-components/icon-button'

export function Toolbar({ IconButton }: { IconButton: (props: { size: string }) => null }) {
  return <IconButton size='icon-sm' />
}

export const real = <IconButton size='sm' aria-label='Close' />
