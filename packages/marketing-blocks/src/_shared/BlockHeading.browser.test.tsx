import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { withBrowserPage } from '../_test/browser'
import { BlockHeading } from './BlockHeading'

withBrowserPage()

describe('BlockHeading', () => {
  it('breaks a long word rather than widening an auto grid track', () => {
    const { container } = render(
      <div className='grid w-[320px]'>
        <BlockHeading
          title='Ticketverkaufsplattformenvergleichsübersicht'
          description='Eintrittskartenvorverkaufsstellenbetreiberverband'
        />
      </div>
    )

    const heading = container.querySelector('h2')!.parentElement!
    expect(heading.getBoundingClientRect().width).toBeLessThanOrEqual(320)
  })
})
