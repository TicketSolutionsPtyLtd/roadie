'use client'

import { Card } from '@oztix/roadie-components/card'
import {
  Navigator,
  useNavigatorSecondary
} from '@oztix/roadie-components/navigator'

export function HomeGuides() {
  const secondary = useNavigatorSecondary('/')
  if (secondary === null) return null
  return (
    <>
      <Navigator.SecondaryItems value='/' className='@md:hidden' />
      <ul className='hidden gap-4 @md:grid @md:grid-cols-2'>
        {secondary.groups
          .flatMap((group) => group.items)
          .map((item) => (
            <li key={item.value} className='grid'>
              <Card
                href={item.href}
                className='grid content-start gap-1 p-5 no-underline'
              >
                <h3 className='text-display-ui-6 text-strong'>{item.label}</h3>
                {item.description ? (
                  <p className='text-sm text-subtle'>{item.description}</p>
                ) : null}
              </Card>
            </li>
          ))}
      </ul>
    </>
  )
}
