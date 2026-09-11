'use client'

import { useEffect, useRef, useState } from 'react'

import { Pane } from '@oztix/roadie-components'
import { Navigator } from '@oztix/roadie-components/navigator'

// Navigator's walks match children by element identity, which Flight breaks
// for server-authored trees, so this canary is a client component that throws
// if the walk loses a Group or a pinned item.

export function NavigatorCanary() {
  const ref = useRef<HTMLDivElement>(null)
  const [failure, setFailure] = useState<Error | null>(null)

  // A timeout, not the effect itself: the section pane mounts a commit after
  // Navigator.Primary publishes the active section.
  useEffect(() => {
    const id = setTimeout(() => {
      const missing = [
        '[data-navigator-section] [data-slot="list-group"]',
        '[data-slot="navigator-primary-pinned"] [data-slot="navigator-item"]',
        '[data-slot="navigator-primary-cluster"] [data-slot="navigator-capsule"][aria-labelledby]'
      ].filter((selector) => !ref.current?.querySelector(selector))
      if (missing.length > 0) {
        setFailure(
          new Error(
            '[Roadie] Navigator RSC canary: the walk lost part of the tree, ' +
              `found nothing for ${missing.join(', ')}.`
          )
        )
      }
    })
    return () => clearTimeout(id)
  }, [])

  if (failure) throw failure

  return (
    <div
      ref={ref}
      className='h-[32rem] overflow-hidden rounded-2xl border border-subtle'
    >
      <Navigator value='catalogue-vinyl'>
        <Navigator.Primary aria-label='Canary primary'>
          <Navigator.Item value='events' href='#events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Item value='events-upcoming'>Upcoming</Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
          <Navigator.Item value='catalogue' href='#catalogue'>
            Catalogue
            <Navigator.Secondary aria-label='Catalogue sections'>
              <Navigator.Group>
                <Navigator.GroupTitle>Formats</Navigator.GroupTitle>
                <Navigator.Item value='catalogue-vinyl'>Vinyl</Navigator.Item>
                <Navigator.Item value='catalogue-digital'>
                  Digital
                </Navigator.Item>
              </Navigator.Group>
            </Navigator.Secondary>
          </Navigator.Item>
          <Navigator.Group>
            <Navigator.GroupTitle>Insights</Navigator.GroupTitle>
            <Navigator.Item value='reports'>Reports</Navigator.Item>
          </Navigator.Group>
          <Navigator.Item value='settings' placement='pinned'>
            Settings
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane>
            <p className='p-3 text-subtle'>Pane</p>
          </Pane>
        </Navigator.Content>
      </Navigator>
    </div>
  )
}
