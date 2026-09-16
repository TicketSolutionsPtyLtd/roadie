'use client'

import { Card } from '@oztix/roadie-components/card'
import {
  Navigator,
  useNavigatorSection
} from '@oztix/roadie-components/navigator'

/** The Home section's pages, read from the navigation so they are declared once: rows on a phone, cards once there's room. */
export function HomeGuides() {
  const section = useNavigatorSection('/')
  if (section === null) return null
  return (
    <>
      <Navigator.SectionItems value='/' className='@md:hidden' />
      <ul className='hidden gap-4 @md:grid @md:grid-cols-2'>
        {section.groups
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
