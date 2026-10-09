import * as Roadie from '@oztix/roadie-components'
import * as Cards from '@oztix/roadie-components/card'
import * as Links from './links'

export const page = (
  <>
    <Roadie.Card render={<section />}>Plain</Roadie.Card>
    <Cards.Card.Root render={<article />}>Root</Cards.Card.Root>
    <Roadie.Breadcrumb.Link as={Links.Event} href='/events'>
      Events
    </Roadie.Breadcrumb.Link>
    <Roadie.Mark render={<h2 />}>The Forum</Roadie.Mark>
    <Roadie.Badge as='span'>Not a target</Roadie.Badge>
    <Links.Card as='section'>Not Roadie</Links.Card>
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
