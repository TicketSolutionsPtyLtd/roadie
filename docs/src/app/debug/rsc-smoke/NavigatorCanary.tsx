'use client'

import { useEffect, useRef } from 'react'

import { Pane } from '@oztix/roadie-components'
import { Navigator } from '@oztix/roadie-components/navigator'

// Navigator's RSC canary. Unlike every other compound on this page,
// Navigator CANNOT be authored in a server component: `splitItemChildren` and
// `Navigator.Primary`'s walk find their children by element reference, and
// Flight replaces the type of every element authored in a server component
// with a `React.lazy` wrapper. Server-authored, the rail silently derives
// `data-form='compact'`, the tab bar comes out empty, the nested `<nav>`
// lands inside the item's `<button>`, and a `Navigator.Group` renders as a
// loose, unheaded run of items. A `'use client'` directive on the leaves does
// not help — the wrapper is applied at the boundary.
//
// So the canary is this client component, rendered from the RSC page: it
// covers the server-safe re-export chain the way the rest of the page does
// (a break surfaces as "Element type is invalid" and fails the docs build),
// and asserts the nested rail form and a rendered Group on view so a silent
// fallback is loud rather than invisible.

export function NavigatorCanary() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const form = ref.current
      ?.querySelector('[data-slot=navigator-rail]')
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
          <Navigator.End>
            <Navigator.Item value='settings'>Settings</Navigator.Item>
          </Navigator.End>
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
