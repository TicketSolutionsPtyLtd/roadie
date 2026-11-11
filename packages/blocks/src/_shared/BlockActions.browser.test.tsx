import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { atWidth, withBrowserPage } from '../_test/browser'
import {
  MINIMUM_FILL_LC,
  MODES,
  fillContrast,
  setMode
} from '../_test/contrast'
import { BlockActions } from './BlockActions'
import { type BlockIntent, emphasisClass, intentClass } from './surface'

withBrowserPage()

const INTENTS: (BlockIntent | undefined)[] = [
  undefined,
  'neutral',
  'brand',
  'brand-secondary',
  'brand-purple',
  'accent',
  'info',
  'success',
  'warning',
  'danger'
]

describe('the strong action on a filled surface', () => {
  for (const fill of ['strong', 'inverted'] as const)
    for (const mode of MODES)
      for (const intent of INTENTS)
        it(`stands out on ${intent ?? 'no-intent'} ${fill} in ${mode}`, () => {
          setMode(mode)
          const { container } = render(
            <div
              className={`${emphasisClass(fill)} ${intentClass(intent)} p-8`}
            >
              <BlockActions
                actions={[{ label: 'Talk to us', href: '/contact/sales' }]}
                intent={intent}
                fill={fill}
              />
            </div>
          )
          const panel = container.firstElementChild!
          const button = container.querySelector('a')!

          expect(fillContrast(button, panel)).toBeGreaterThanOrEqual(
            MINIMUM_FILL_LC
          )
        })
})

describe('action icons', () => {
  const icons = () => (
    <div className='@container'>
      <BlockActions
        actions={[
          { label: 'Talk to us', href: '/contact/sales', icon: 'chat' },
          {
            label: 'Our studio',
            href: 'https://studio.oztix.com.au',
            icon: 'external'
          }
        ]}
      />
    </div>
  )
  const iconIn = (name: string) =>
    screen.getByRole('link', { name: new RegExp(name) }).querySelector('svg')!

  it('drops a leading icon in a narrow block, keeping a trailing one', async () => {
    await atWidth(375, 800)
    render(icons())

    expect(iconIn('Talk to us')).not.toBeVisible()
    expect(iconIn('Our studio')).toBeVisible()
  })

  it('shows a leading icon once the block is wide enough', async () => {
    await atWidth(800, 800)
    render(icons())

    expect(iconIn('Talk to us')).toBeVisible()
  })
})
