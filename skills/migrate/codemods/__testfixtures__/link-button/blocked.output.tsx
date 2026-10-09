'use client'

import NextLink from 'next/link'

import { Button } from '@oztix/roadie-components/button';

import {
  LinkButton,
  type LinkButtonProps
} from '@oztix/roadie-components/link-button'

export function Links(props: LinkButtonProps) {
  return (
    <>
      <LinkButton as={NextLink} href='/events'>
        Events
      </LinkButton>
      <LinkButton {...props} />
      <LinkButton>No destination</LinkButton>
      <Button href='/venues'>Venues</Button>
    </>
  );
}
