import type * as Types from '@oztix/roadie-components'
import * as Cards from '@oztix/roadie-components/card'
import * as Roadie from '@oztix/roadie-components'

interface Props {
  Roadie: string
  next: Types.LinkButtonProps
}

export const keys = { Roadie: 1 }

export { Roadie }

export function Shadowed(Roadie: { LinkButton: () => null }) {
  return <Roadie.LinkButton href='/b' />
}

export const parts = { ...Cards }
export const links = (
  <>
    <Roadie.Button>Buy</Roadie.Button>
    <Roadie.LinkButton href='/a'>A</Roadie.LinkButton>
  </>
)
