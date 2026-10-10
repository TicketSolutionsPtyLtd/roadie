import { Button } from '@oztix/roadie-components/button';

export function Row({ LinkButton }: { LinkButton: () => null }) {
  return <LinkButton href='/row' />
}

export function Local() {
  const LinkButton = (props: { href: string }) => <a {...props} />
  return <LinkButton href='/local' />
}

export const real = <Button href='/events'>Events</Button>
