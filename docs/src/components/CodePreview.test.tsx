// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CodePreview } from './CodePreview'

const runner = vi.hoisted(() => ({ loads: 0, failFirst: 0 }))

vi.mock('./LiveRunner', () => {
  runner.loads++
  if (runner.loads <= runner.failFirst) throw new Error('Failed to load chunk')
  return { default: () => <p>Example rendered</p> }
})

afterEach(cleanup)

function Page() {
  return (
    <main>
      <h1>Number field</h1>
      <CodePreview language='tsx-live' eager>
        {'<NumberField />'}
      </CodePreview>
      <p>Accessibility notes</p>
    </main>
  )
}

describe('CodePreview', () => {
  it('shows an error state when the live runner fails to load, and keeps the page', async () => {
    runner.failFirst = 1
    render(<Page />)

    await screen.findByText("We couldn't load this example")
    screen.getByRole('heading', { name: 'Number field' })
    screen.getByText('Accessibility notes')
    expect(document.body.textContent).toContain('<NumberField />')
  })

  it('loads the example again on Try again, and the examples after it', async () => {
    runner.failFirst = 1
    render(<Page />)

    const retry = await screen.findByRole('button', { name: 'Try again' })
    act(() => fireEvent.click(retry))

    await screen.findByText('Example rendered')
    expect(screen.queryByText("We couldn't load this example")).toBeNull()

    render(<Page />)
    expect(await screen.findAllByText('Example rendered')).toHaveLength(2)
    expect(screen.queryByText("We couldn't load this example")).toBeNull()
  })
})
