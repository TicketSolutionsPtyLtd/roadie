import { LinkButton } from '@oztix/roadie-components/link-button'

export function Row({ LinkButton }: { LinkButton: () => null }) {
  return <LinkButton href='/row' />
}

export function Local() {
  const LinkButton = (props: { href: string }) => <a {...props} />
  return <LinkButton href='/local' />
}

export const real = <LinkButton href='/events'>Events</LinkButton>
