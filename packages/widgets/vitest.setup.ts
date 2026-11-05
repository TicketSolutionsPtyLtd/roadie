import { createElement } from 'react'

import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// @number-flow/react is a Web Component (custom element) that animates digit
// rolls. Its update path calls into the registered custom element
// (`this.el.willUpdate`), which jsdom doesn't upgrade — so it throws under test.
// It's purely presentational, so we stub it with a plain span that renders the
// text it would show, formatted with Intl as NumberFlow does.
vi.mock('@number-flow/react', () => ({
  default: ({
    value,
    locales,
    format,
    prefix = '',
    suffix = '',
    className
  }: {
    value: number
    locales?: string
    format?: Intl.NumberFormatOptions
    prefix?: string
    suffix?: string
    className?: string
  }) =>
    createElement(
      'span',
      { className },
      `${prefix}${new Intl.NumberFormat(locales, format).format(value)}${suffix}`
    )
}))
