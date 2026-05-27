import { createElement } from 'react'

import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// @number-flow/react is a Web Component (custom element) that animates digit
// rolls. Its update path calls into the registered custom element
// (`this.el.willUpdate`), which jsdom doesn't upgrade — so it throws under test.
// It's purely presentational, so we stub it with a plain span that renders the
// same prefix/value/suffix text. Behaviour under test (navigation, callbacks,
// intents) is unaffected.
vi.mock('@number-flow/react', () => ({
  default: ({
    value,
    prefix = '',
    suffix = '',
    className
  }: {
    value: number
    prefix?: string
    suffix?: string
    className?: string
  }) => createElement('span', { className }, `${prefix}${value}${suffix}`)
}))
