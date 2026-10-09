import { HeartIcon } from '@phosphor-icons/react/ssr'

import { Card } from '@oztix/roadie-components/card'
import {
  LinkButton,
  LinkIconButton
} from '@oztix/roadie-components/link-button'

export function EventCard() {
  return (
    <Card>
      <LinkButton href='/events/1' intent='brand' emphasis='strong'>
        Get tickets
      </LinkButton>
      <LinkButton as='a' href='https://example.com'>
        Venue site
      </LinkButton>
      <LinkIconButton aria-label='Save' href='/saved' size='icon-sm'>
        <HeartIcon className='size-4' weight='bold' />
      </LinkIconButton>
    </Card>
  )
}
