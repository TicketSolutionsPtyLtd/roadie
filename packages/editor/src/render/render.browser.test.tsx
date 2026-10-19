import { render } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import roadieCss from '../../vitest.browser.css?inline'
import { type EmbedProvider, defaultEmbedProviders } from '../schema'
import { renderEditorValue } from './index'

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
