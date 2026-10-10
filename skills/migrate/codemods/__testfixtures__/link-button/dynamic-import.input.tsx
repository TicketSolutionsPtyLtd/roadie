import { lazy } from 'react'

const LinkButton = lazy(() =>
  import('@oztix/roadie-components/link-button').then((module) => ({
    default: module.LinkButton
  }))
)
const Button = lazy(() => import('@oztix/roadie-components/button'))
const Roadie = await import('@oztix/roadie-components')
const Theirs = await import('@acme/ui/link-button')

export { LinkButton, Button, Roadie, Theirs }
