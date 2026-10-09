import { XIcon } from '@phosphor-icons/react/ssr'

import * as Roadie from '@oztix/roadie-components'
import * as Other from './other'

export const close = (
  <>
    <Roadie.IconButton aria-label='Close' size='sm'>
      <XIcon className='size-4' weight='bold' />
    </Roadie.IconButton>
    <Roadie.LinkIconButton aria-label='Home' href='/' size='md'>
      <XIcon className='size-4' weight='bold' />
    </Roadie.LinkIconButton>
    <Roadie.Button size='icon-md'>
      <XIcon className='size-4' weight='bold' />
    </Roadie.Button>
    <Other.IconButton size='icon-sm' />
  </>
)

export function Shadowed(Roadie: any) {
  return (
    <Roadie.Popover.Content positionerProps={{ side: 'top' }}>
      <Roadie.IconButton aria-label='Close' size='icon-sm' />
      <Roadie.Card as='section'>Card</Roadie.Card>
    </Roadie.Popover.Content>
  )
}
