import NextLink from 'next/link'

import { Breadcrumb } from '@oztix/roadie-components/breadcrumb'
import { Card } from '@oztix/roadie-components/card'
import { Carousel } from '@oztix/roadie-components/carousel'
import { Mark } from '@oztix/roadie-components/mark'
import { Prose } from '@oztix/roadie-components'
import * as Links from './links'

export function Page({ onSelect }: { onSelect: () => void }) {
  return (
    <>
      <Card render={<button />} onClick={onSelect}>
        Select
      </Card>
      <Card.Root render={<section />}>Plain</Card.Root>
      <Breadcrumb.Link as={NextLink} href='/events'>
        Events
      </Breadcrumb.Link>
      <Carousel.Title render={<h3 />}>Upcoming</Carousel.Title>
      <Carousel.TitleLink as={Links.Event} href='/events/1'>
        Gang of Youths
      </Carousel.TitleLink>
      <Mark render={<h2 />}>The Forum</Mark>
      <Prose render={<article />}>{'<p>Doors 7pm</p>'}</Prose>
    </>
  );
}
