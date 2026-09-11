'use client'

import { useEffect, useRef, useState } from 'react'

import { Pane } from '@oztix/roadie-components'
import { Navigator } from '@oztix/roadie-components/navigator'

// Navigator's walks match children by element identity, which Flight breaks
// for server-authored trees, so this canary is a client component that throws
// if the active section's pane loses its Group.

export function NavigatorCanary() {
  const ref = useRef<HTMLDivElement>(null)
  const [failure, setFailure] = useState<Error | null>(null)

  // A timeout, not the effect itself: the section pane mounts a commit after
  // Navigator.Primary publishes the active section.
  useEffect(() => {
    const id = setTimeout(() => {
      // A server-authored tree would lazy-wrap Navigator.Group and the walk
      // would drop it into a loose, untitled run of rows.
      const group = ref.current?.querySelector(
        '[data-navigator-section] [data-slot="list-group"]'
      )
      if (!group) {
        setFailure(
          new Error(
            '[Roadie] Navigator RSC canary: the active section pane must ' +
              'render its Navigator.Group, found none.'
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
          <Navigator.Item value='events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Item value='events-upcoming'>Upcoming</Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
          <Navigator.Item value='catalogue'>
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
          <Navigator.Item value='reports'>Reports</Navigator.Item>
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
