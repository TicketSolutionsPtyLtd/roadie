'use client'

import { useState } from 'react'

import { Navigator, Pane } from '@oztix/roadie-components'

// The second shape the canary pins: the panes are the app's own children, held
// in state, with no router under them.
export default function OwnPage() {
  const [open, setOpen] = useState(false)
  return (
    <Navigator value={open ? '/own/deep' : '/own'}>
      <Navigator.Content>
        <Pane role='list' depth={0}>
          <div className='p-4'>List</div>
        </Pane>
        <Pane role='detail' depth={1} current={!open} data-testid='one'>
          <div className='grid gap-2 p-4'>
            <button
              type='button'
              data-testid='open'
              onClick={() => setOpen(true)}
            >
              Open
            </button>
            <p>One</p>
          </div>
        </Pane>
        {open ? (
          <Pane role='detail' depth={2} current data-testid='two'>
            <div className='grid gap-2 p-4'>
              <button
                type='button'
                data-testid='close'
                onClick={() => setOpen(false)}
              >
                Close
              </button>
              <p>TWO-CONTENT</p>
            </div>
          </Pane>
        ) : null}
      </Navigator.Content>
    </Navigator>
  )
}
