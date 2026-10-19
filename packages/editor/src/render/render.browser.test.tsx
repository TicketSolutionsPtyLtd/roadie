import { render } from '@testing-library/react'
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished
} from 'vitest'

import roadieCss from '../../vitest.browser.css?inline'
import { type EmbedProvider, defaultEmbedProviders } from '../schema'
import { renderEditorHtml, renderEditorValue } from './index'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())

// Players point at this server, so the tests load nothing from the internet.
const localPlayers: EmbedProvider[] = defaultEmbedProviders.map((provider) => ({
  ...provider,
  src: ({ id }) => `/embed-test/${provider.name}/${id}`
}))

function renderedPlayer(attrs: Record<string, unknown>) {
  const { container } = render(
    <div style={{ width: 720 }}>
      {renderEditorValue(
        {
          version: 1,
          preset: 'rich',
          doc: {
            type: 'doc',
            content: [
              { type: 'embed', attrs },
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Sold out' }]
              }
            ]
          }
        },
        { embedProviders: localPlayers }
      )}
    </div>
  )
  return {
    player: container.querySelector('iframe')!.getBoundingClientRect(),
    prose: container.querySelector('.prose')!.getBoundingClientRect()
  }
}

describe('renderEditorValue embed size', () => {
  it('keeps a portrait player narrow, at the start of the text', () => {
    const { player, prose } = renderedPlayer({
      provider: 'tiktok',
      id: '7000000000000000001',
      params: null
    })

    expect(player.width).toBeLessThan(prose.width / 2)
    expect(player.width / player.height).toBeCloseTo(9 / 16, 2)
    expect(player.left).toBeCloseTo(prose.left, 0)
  })

  it.each([
    ['a landscape player', { provider: 'youtube', id: 'exampleVid1' }],
    [
      'a fixed-height player',
      {
        provider: 'spotify',
        id: 'exampleTrack0000000001',
        params: { type: 'track' }
      }
    ]
  ])('fills the width with %s', (_, attrs) => {
    const { player, prose } = renderedPlayer({ params: null, ...attrs })

    expect(player.width).toBeCloseTo(prose.width, 0)
  })
})

describe('renderEditorValue tables', () => {
  it('scrolls a wide table inside a 320px container rather than widening it', () => {
    const header = ['Time', 'Stage', 'Act', 'Genre', 'Tickets', 'Notes']
    const cellsOf = (type: string, values: string[]) =>
      values.map((value) => ({
        type,
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: value }] }
        ]
      }))
    const { container } = render(
      <div style={{ width: 320 }}>
        {renderEditorValue({
          version: 1,
          preset: 'rich',
          doc: {
            type: 'doc',
            content: [
              {
                type: 'table',
                content: [
                  { type: 'tableRow', content: cellsOf('tableHeader', header) },
                  { type: 'tableRow', content: cellsOf('tableCell', header) }
                ]
              }
            ]
          }
        })}
      </div>
    )
    const prose = container.querySelector<HTMLElement>('.prose')!
    const scroller = container.querySelector<HTMLElement>('.prose-scroll')!

    expect(prose.getBoundingClientRect().width).toBe(320)
    expect(scroller.getBoundingClientRect().width).toBe(320)
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)
  })

  const cellOf = (type: string, value: string, attrs?: object) => ({
    type,
    ...(attrs && { attrs }),
    content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }]
  })
  const spannedHeader = {
    version: 1,
    preset: 'rich',
    doc: {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                cellOf('tableHeader', 'Time', { rowspan: 2 }),
                cellOf('tableHeader', 'Act')
              ]
            },
            { type: 'tableRow', content: [cellOf('tableCell', 'Ochre Kite')] }
          ]
        }
      ]
    }
  }

  function leftOf(container: HTMLElement, text: string) {
    const cell = [...container.querySelectorAll('th, td')].find(
      (each) => each.textContent === text
    )!
    return cell.getBoundingClientRect().left
  }

  it.each([
    [
      'renderEditorValue',
      () => render(<div>{renderEditorValue(spannedHeader)}</div>).container
    ],
    [
      'renderEditorHtml',
      () => {
        const container = document.createElement('div')
        container.innerHTML = renderEditorHtml(spannedHeader)
        document.body.append(container)
        onTestFinished(() => container.remove())
        return container
      }
    ]
  ])(
    'keeps a header row’s rowspan with %s, so the next row sits beside it',
    (_, rendered) => {
      const container = rendered()

      expect(leftOf(container, 'Ochre Kite')).toBe(leftOf(container, 'Act'))
      expect(leftOf(container, 'Ochre Kite')).toBeGreaterThan(
        leftOf(container, 'Time')
      )
    }
  )
})
