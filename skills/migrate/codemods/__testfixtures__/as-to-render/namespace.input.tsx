import * as Roadie from '@oztix/roadie-components'
import * as Cards from '@oztix/roadie-components/card'
import * as Links from './links'

export const page = (
  <>
    <Roadie.Card as='section'>Plain</Roadie.Card>
    <Cards.Card.Root as='article'>Root</Cards.Card.Root>
    <Roadie.Breadcrumb.Link as={Links.Event} href='/events'>
      Events
    </Roadie.Breadcrumb.Link>
    <Roadie.Mark as='h2'>The Forum</Roadie.Mark>
    <Roadie.Badge as='span'>Not a target</Roadie.Badge>
    <Links.Card as='section'>Not Roadie</Links.Card>
  </>
)
