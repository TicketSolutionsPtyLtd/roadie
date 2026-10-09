// @vitest-environment jsdom
import type { ReactNode } from 'react'

import { cleanup, render, waitFor } from '@testing-library/react'
import { LiveError, LivePreview, LiveProvider } from 'react-live'
import { afterEach, describe, expect, it } from 'vitest'

import {
  captionsOf,
  previewLayoutOf,
  toPreviewCode,
  withBasePath
} from './fence-layout.mjs'

afterEach(cleanup)

const meta = (text: string) => previewLayoutOf(text.split(' '))

describe('previewLayoutOf', () => {
  // What each value looks like is measured in e2e/fence-layout.e2e.test.ts.
  it.each([
    'layout=stack',
    'layout=row gap=1',
    'layout=stack gap=8 width=xs',
    'width=lg'
  ])('accepts the documented options %s', (words) => {
    expect(meta(words)).toEqual(expect.any(String))
  })

  it('sets no layout for a fence without layout options', () => {
    expect(meta('id=orders eager')).toBeUndefined()
  })

  it.each([
    ['layout=column', /layout=column must be one of stack, row/],
    ['layout=row gap=5', /gap=5 must be one of 1, 2, 3, 4, 6, 8/],
    ['width=140', /width=140 must be one of xs, sm, md, lg/],
    ['gap=4', /gap=4 needs layout=stack or layout=row/]
  ])('rejects %s', (words, message) => {
    expect(() => meta(words)).toThrow(message)
  })
})

describe('captionsOf', () => {
  it('reads only caption comments on a line of their own at column 0', () => {
    const code = [
      '{/* Normal */}',
      '<Badge>One</Badge>',
      '  {/* nested, not a caption */}',
      '{/*With icon*/}',
      '<Badge>Two</Badge>'
    ].join('\n')
    expect(captionsOf(code)).toEqual(['Normal', 'With icon'])
  })
})

const Badge = ({ children }: { children: ReactNode }) => (
  <span data-testid='badge'>{children}</span>
)
const PreviewCell = ({
  label,
  children
}: {
  label: string
  children: ReactNode
}) => (
  <figure data-testid='cell'>
    <figcaption>{label}</figcaption>
    {children}
  </figure>
)

function run(code: string) {
  return render(
    <LiveProvider
      code={code}
      scope={{ Badge, PreviewCell }}
      transformCode={toPreviewCode}
    >
      <LivePreview data-testid='preview' />
      <LiveError data-testid='error' />
    </LiveProvider>
  )
}

describe('toPreviewCode', () => {
  it('runs top-level siblings, which react-live alone rejects', async () => {
    const { findAllByTestId, queryByTestId } = run(
      '<Badge>One</Badge>\n<Badge>Two</Badge>'
    )
    expect(await findAllByTestId('badge')).toHaveLength(2)
    expect(queryByTestId('error')).toBeNull()
  })

  it('puts each captioned element in a cell under its caption', async () => {
    const { findAllByTestId, getByTestId } = run(
      [
        '{/* Normal */}',
        '<Badge>One</Badge>',
        '{/* Subtle */}',
        '<Badge>Two</Badge>',
        '<Badge>Three</Badge>'
      ].join('\n')
    )
    const cells = await findAllByTestId('cell')
    expect(cells.map((cell) => cell.textContent)).toEqual([
      'NormalOne',
      'SubtleTwoThree'
    ])
    expect(getByTestId('preview').children).toHaveLength(2)
  })

  it('reports errors on the fence line they happen on', async () => {
    const { findByTestId } = run(
      ['{/* Normal */}', '<Badge>One</Badge>', '<Missing />'].join('\n')
    )
    await waitFor(async () =>
      expect((await findByTestId('error')).textContent).toMatch(/Missing/)
    )
    expect(toPreviewCode('{/* A */}\n<B />\n<C />').split('\n')).toHaveLength(3)
  })

  it('leaves a fence that renders a function component as it is', () => {
    const code = 'function Example() {\n  return <Badge>One</Badge>\n}'
    expect(toPreviewCode(code)).toBe(code)
  })
})

describe('withBasePath', () => {
  it('prefixes quoted root-relative file URLs and nothing else', () => {
    const code = [
      "image: '/cart-demo-event.svg'",
      '<Button href="/roadie-logo.png" download />',
      "<Link href='/foundations/linking' />",
      "src='https://example.com/logo.png'",
      "src='//cdn.example.com/logo.png'"
    ].join('\n')
    expect(withBasePath(code, '/roadie').split('\n')).toEqual([
      "image: '/roadie/cart-demo-event.svg'",
      '<Button href="/roadie/roadie-logo.png" download />',
      "<Link href='/foundations/linking' />",
      "src='https://example.com/logo.png'",
      "src='//cdn.example.com/logo.png'"
    ])
  })

  it.each([
    ["<Link href='/components/button' />", 'an internal route'],
    ["<Link href='/components/button/' />", 'a route with a trailing slash'],
    ["href='/users/jane.doe'", 'a route with a dot'],
    ["href='/events/v1.10'", 'a versioned route'],
    ["fetch('/api/export.csv')", 'an API path'],
    ["const label = '/ 2 tickets.png'", 'a string with a space'],
    ["const path = '/'", 'the root'],
    ['`/template.png`', 'a template literal'],
    ['\'/a.png"', 'mismatched quotes'],
    ["src='/roadie/logo.png'", 'a URL that already has the base path']
  ])('leaves %s alone (%s)', (code) => {
    expect(withBasePath(code, '/roadie')).toBe(code)
  })

  it('keeps a query or hash on a file URL', () => {
    expect(withBasePath("src='/icons.svg#star'", '/roadie')).toBe(
      "src='/roadie/icons.svg#star'"
    )
    expect(withBasePath('src="/logo.PNG?v=2"', '/roadie')).toBe(
      'src="/roadie/logo.PNG?v=2"'
    )
  })

  it('prefixes a file whose name starts like the base path', () => {
    expect(withBasePath("'/roadie-logo.png'", '/roadie')).toBe(
      "'/roadie/roadie-logo.png'"
    )
  })

  it('leaves code alone without a base path', () => {
    expect(withBasePath("'/x.svg'", '')).toBe("'/x.svg'")
  })
})
