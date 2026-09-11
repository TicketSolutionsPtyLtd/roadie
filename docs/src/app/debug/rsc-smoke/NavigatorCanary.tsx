'use client'

import { useEffect, useRef } from 'react'

import { Pane } from '@oztix/roadie-components'
import { Navigator } from '@oztix/roadie-components/navigator'

// Navigator's walks match children by element identity, which Flight breaks
// for server-authored trees, so this canary is a client component that throws
// if the vertical navigation loses its nested form or its Group.

export function NavigatorCanary() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const form = ref.current
      ?.querySelector(
        '[data-slot=navigator-primary][data-orientation=vertical]'
      )
      ?.getAttribute('data-form')
    if (form !== 'nested') {
      throw new Error(
        '[Roadie] Navigator RSC canary: a declared Navigator.Secondary must ' +
          `derive data-form='nested', got '${form}'.`
      )
    }

    // Navigator.Group is matched by reference in `secondaryItems`, the same
    // identity-walk hazard as Navigator.Primary. A server-authored tree would
    // lazy-wrap the type and the walk would silently drop the group into a
    // loose, unheaded run of items instead of a titled list.
    const group = ref.current?.querySelector(
      '[data-slot=navigator-secondary] [data-slot=navigator-group-list]'
    )
    if (!group) {
      throw new Error(
        '[Roadie] Navigator RSC canary: an active Navigator.Secondary must ' +
          'render its Navigator.Group, found none.'
      )
    }
  }, [])

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
