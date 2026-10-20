import { type ReactNode, StrictMode } from 'react'

import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Card } from '.'

const NO_CONTENT = /Card has no Card\.Content/

function warnings() {
  return vi.spyOn(console, 'warn').mockImplementation(() => {})
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

function EventBody({ children }: { children: ReactNode }) {
  return <Card.Content>{children}</Card.Content>
}

const withoutContent: [string, ReactNode][] = [
  [
    'only a header',
    <Card key='header'>
      <Card.Header>
        <Card.Title>Midnight Frequency</Card.Title>
      </Card.Header>
    </Card>
  ],
  [
    'only an image',
    <Card key='image' href='/events/1'>
      <Card.Image src='poster.jpg' alt='' />
    </Card>
  ],
  ['bare children', <Card key='bare'>Midnight Frequency</Card>],
  [
    'subtler emphasis and a header and footer',
    <Card key='subtler' emphasis='subtler'>
      <Card.Header>
        <Card.Title>Midnight Frequency</Card.Title>
      </Card.Header>
      <Card.Footer>$89</Card.Footer>
    </Card>
  ],
  [
    'the ticket variant and only a footer',
    <Card key='ticket' variant='ticket'>
      <Card.Footer>Sam Okafor</Card.Footer>
    </Card>
  ]
]

const withContent: [string, ReactNode][] = [
  [
    'a header and content',
    <Card key='header'>
      <Card.Header>
        <Card.Title>Midnight Frequency</Card.Title>
      </Card.Header>
      <Card.Content>Doors open at 7pm.</Card.Content>
    </Card>
  ],
  [
    'content in a fragment',
    <Card key='fragment'>
      <>
        <Card.Content>Doors open at 7pm.</Card.Content>
      </>
    </Card>
  ],
  [
    'content inside a wrapper component',
    <Card key='wrapper'>
      <EventBody>Doors open at 7pm.</EventBody>
    </Card>
  ],
  [
    'content nested in a plain element',
    <Card key='nested'>
      <div>
        <Card.Content>Doors open at 7pm.</Card.Content>
      </div>
    </Card>
  ]
]

describe('Card without Card.Content', () => {
  it.each(withoutContent)('warns in development with %s', (_, card) => {
    const warn = warnings()
    render(card)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toMatch(NO_CONTENT)
  })

  it.each(withContent)('stays quiet with %s', (_, card) => {
    const warn = warnings()
    render(card)
    expect(warn).not.toHaveBeenCalled()
  })

  it.each(withoutContent)('stays quiet in production with %s', (_, card) => {
    vi.stubEnv('NODE_ENV', 'production')
    const warn = warnings()
    render(card)
    expect(warn).not.toHaveBeenCalled()
  })

  it('warns once under StrictMode', () => {
    const warn = warnings()
    render(
      <StrictMode>
        <Card>
          <Card.Header>
            <Card.Title>Midnight Frequency</Card.Title>
          </Card.Header>
        </Card>
      </StrictMode>
    )
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('stays quiet under StrictMode with content', () => {
    const warn = warnings()
    render(
      <StrictMode>
        <Card>
          <Card.Content>Doors open at 7pm.</Card.Content>
        </Card>
      </StrictMode>
    )
    expect(warn).not.toHaveBeenCalled()
  })

  it("judges a nested card by its own parts, not its parent's", () => {
    const warn = warnings()
    render(
      <Card>
        <Card.Content>
          <Card emphasis='subtle'>
            <Card.Header>
              <Card.Title>Support act</Card.Title>
            </Card.Header>
          </Card>
        </Card.Content>
      </Card>
    )
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it("doesn't count a nested card's content as its parent's", () => {
    const warn = warnings()
    render(
      <Card>
        <Card.Header>
          <Card emphasis='subtle'>
            <Card.Content>Support act</Card.Content>
          </Card>
        </Card.Header>
      </Card>
    )
    expect(warn).toHaveBeenCalledTimes(1)
  })
})
