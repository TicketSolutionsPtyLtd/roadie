import { Card } from '@oztix/roadie-components/card'

declare const slots: Array<(props: { as: string }) => null>

for (const Card of slots) {
  ;<Card as='section' />
}

{
  const { Card } = { Card: (props: { as: string }) => null }
  ;<Card as='section' />
}

for (let [Card = slots[0]] = slots; ; ) {
  ;<Card as='section' />
}

switch (slots.length) {
  case 1:
    class Card {}
    ;<Card as='section' />
}

class Holder {
  static {
    const [, ...[Card]] = slots
    ;<Card as='section' />
  }
}

export const real = <Card as='section'>Real</Card>
