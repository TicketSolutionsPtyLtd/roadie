import { Card } from '@oztix/roadie-components/card'
import { Mark } from '@oztix/roadie-components/mark'

export function Tile({ tag, linked }: { tag: 'div' | 'li'; linked: boolean }) {
  return (
    <Card as={tag}>
      <Mark as={linked ? 'a' : 'mark'} render={<span />}>
        Ruby Fields
      </Mark>
      <Mark as={linked ? 'a' : 'mark'}>Ruby Fields</Mark>
    </Card>
  )
}
