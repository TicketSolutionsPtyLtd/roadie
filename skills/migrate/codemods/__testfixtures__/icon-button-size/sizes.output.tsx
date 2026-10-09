import { XIcon } from '@phosphor-icons/react/ssr'

import { Button, IconButton } from '@oztix/roadie-components/button'

export const close = (
  <>
    <IconButton aria-label='Close' size='sm'>
      <XIcon className='size-4' weight='bold' />
    </IconButton>
    <IconButton aria-label='Close' size='lg'>
      <XIcon className='size-4' weight='bold' />
    </IconButton>
    <IconButton aria-label='Close' size='sm'>
      <XIcon className='size-4' weight='bold' />
    </IconButton>
    <Button size='icon-md'>
      <XIcon className='size-4' weight='bold' />
    </Button>
  </>
)
