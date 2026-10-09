import { HeartIcon } from '@phosphor-icons/react/ssr'

import { Button, IconButton } from '@oztix/roadie-components/button';
import { Card } from '@oztix/roadie-components/card'

export function EventCard() {
  return (
    <Card>
      <Button href='/events/1' intent='brand' emphasis='strong'>
        Get tickets
      </Button>
      <Button href='https://example.com'>
        Venue site
      </Button>
      <IconButton aria-label='Save' href='/saved' size='icon-sm'>
        <HeartIcon className='size-4' weight='bold' />
      </IconButton>
    </Card>
  );
}
