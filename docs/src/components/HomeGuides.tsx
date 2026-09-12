'use client'

import { Card } from '@oztix/roadie-components/card'
import { useNavigatorSection } from '@oztix/roadie-components/navigator'

/** The Home section's pages as cards, read from the navigation so they are declared once. */
export function HomeGuides() {
  const section = useNavigatorSection('/')
  if (section === null) return null
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
      {section.groups
        .flatMap((group) => group.items)
        .map((item) => (
          <Card
            key={item.value}
            href={item.href}
            className='grid h-full content-start gap-1 p-5 no-underline'
          >
            <h3 className='text-display-ui-6 text-strong'>{item.label}</h3>
            {item.description ? (
              <p className='text-sm text-subtle'>{item.description}</p>
            ) : null}
          </Card>
        ))}
    </div>
  )
}
