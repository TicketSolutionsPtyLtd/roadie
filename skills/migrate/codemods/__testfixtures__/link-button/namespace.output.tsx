import { Button, IconButton } from '@oztix/roadie-components/button';
import * as Roadie from '@oztix/roadie-components'

export function Links({ next }: { next: Roadie.LinkButtonProps }) {
  const Fallback = Roadie.LinkIconButton
  const { LinkButton: Picked } = Roadie
  return (
    <>
      <Button href='/events'>
        Events
      </Button>
      <IconButton aria-label='Cart' href='/cart' />
      <Roadie.LinkButton>No destination</Roadie.LinkButton>
      <Roadie.Badge>New</Roadie.Badge>
      <Fallback aria-label='Home' href='/' />
      <Picked {...next} />
    </>
  );
}
