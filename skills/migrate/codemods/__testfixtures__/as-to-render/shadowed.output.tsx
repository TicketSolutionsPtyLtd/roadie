import { Card } from '@oztix/roadie-components/card'
import { Mark } from '@acme/ui'

export function Slot({ Card }: { Card: (props: { as: string }) => null }) {
  return <Card as='section' />
}

export function Local() {
  const Card = (props: { as: string }) => <div {...props} />
  return <Card as='section' />
}

export const real = (
  <>
    <Card render={<section />}>Real</Card>
    <Mark as='h1'>Theirs</Mark>
  </>
)
