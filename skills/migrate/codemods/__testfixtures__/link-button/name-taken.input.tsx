import { LinkButton, Badge } from '@oztix/roadie-components'

function Button() {
  return <button type='button'>Local</button>
}

export function Row() {
  return (
    <>
      <Badge>New</Badge>
      <Button />
      <LinkButton href='/events'>All events</LinkButton>
    </>
  )
}
