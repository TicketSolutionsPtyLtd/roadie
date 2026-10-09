'use client'

import NextLink from 'next/link'

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
      <LinkButton href='/venues'>Venues</LinkButton>
    </>
  )
}
