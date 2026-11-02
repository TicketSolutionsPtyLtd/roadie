import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { withBrowserPage } from '../_test/browser'
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
