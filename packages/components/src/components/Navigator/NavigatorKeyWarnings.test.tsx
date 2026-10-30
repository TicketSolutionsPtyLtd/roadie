import { Children, type ReactElement, type ReactNode } from 'react'

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  type MockInstance,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { Navigator } from '.'
import { Pane } from '../Pane'
import {
  FakeIcon,
  flushViewportMeasurement,
  primaryOf,
  testBrand
} from './testUtils'

// React logs a missing-key warning once per parent name per module instance,
// and each test file gets its own. So this file holds only tests that expect
// no key warning: one can be swallowed only after another has failed.
let consoleError: MockInstance<typeof console.error>
const keyWarnings = () =>
  consoleError.mock.calls.filter((call) => /unique "key"/.test(String(call[0])))

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

const plain = (element: ReactElement): ReactNode => element

describe('Navigator key warnings', () => {
  // A unique parent name, so it can't swallow the warnings the tests below look for.
  function ControlCopiesChildren({ children }: { children: ReactNode }) {
    return Children.toArray(children)
  }

  it('detects the key warning a copied streamed child raises', () => {
    render(
      <ControlCopiesChildren>
        <span>Plain</span>
        {streamed(<span>Streamed</span>)}
      </ControlCopiesChildren>
    )

    expect(screen.getByText('Streamed')).toBeInTheDocument()
    expect(keyWarnings()).toHaveLength(1)
  })

  it.each([
    ['streamed', streamed],
    ['plain', plain]
  ])('renders a %s route child without a key warning', async (_, arrive) => {
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/a' href='/a'>
            A
          </Navigator.Item>
        </Navigator.Primary>
        {arrive(<Pane>Detail</Pane>)}
      </Navigator>
    )
    await flushViewportMeasurement()

    expect(screen.getByText('Detail')).toBeInTheDocument()
    expect(keyWarnings()).toEqual([])
  })

  it.each([
    ['streamed', streamed],
    ['plain', plain]
  ])(
    'renders an item label with a %s part without a key warning',
    async (_, arrive) => {
      render(
        <Navigator value='/a'>
          <Navigator.Primary aria-label='Main'>
            {testBrand}
            <Navigator.Item value='/a' href='/a' icon={<FakeIcon />}>
              Inbox
              {arrive(<span>, 3 new</span>)}
            </Navigator.Item>
          </Navigator.Primary>
        </Navigator>
      )
      await flushViewportMeasurement()

      expect(
        within(primaryOf('vertical')).getByRole('link', {
          name: 'Inbox, 3 new'
        })
      ).toBeInTheDocument()
      expect(keyWarnings()).toEqual([])
    }
  )

  it.each([
    ['streamed', streamed],
    ['plain', plain]
  ])(
    'opens a menu with a %s item and selects it without a key warning',
    async (_, arrive) => {
      const archive = vi.fn()
      const logOut = vi.fn()
      const user = userEvent.setup()
      render(
        <Navigator value='/a'>
          <Navigator.Primary aria-label='Main'>
            {testBrand}
            <Navigator.Item value='/a' href='/a' icon={<FakeIcon />}>
              Inbox
            </Navigator.Item>
            <Navigator.Item value='account' icon={<FakeIcon />}>
              Account
              <Navigator.Menu>
                <Navigator.MenuItem onSelect={() => {}}>
                  Profile
                </Navigator.MenuItem>
                {arrive(
                  <Navigator.MenuItem onSelect={archive}>
                    Archive
                  </Navigator.MenuItem>
                )}
                <Navigator.MenuItem onSelect={logOut}>
                  Log out
                </Navigator.MenuItem>
              </Navigator.Menu>
            </Navigator.Item>
          </Navigator.Primary>
        </Navigator>
      )
      await flushViewportMeasurement()
      const choose = async (name: string) => {
        await user.click(
          within(primaryOf('vertical')).getByRole('button', {
            name: 'Account'
          })
        )
        const menu = await screen.findByRole('menu')
        await user.click(within(menu).getByRole('menuitem', { name }))
      }

      await choose('Archive')
      expect(archive).toHaveBeenCalledOnce()
      // An item after a streamed one still runs its own handler, not its neighbour's.
      await choose('Log out')
      expect(logOut).toHaveBeenCalledOnce()
      expect(archive).toHaveBeenCalledOnce()
      expect(keyWarnings()).toEqual([])
    }
  )
})

// A streamed child can arrive as a resolved promise React unwraps, which skips
// the key check JSX gives its static children.
function streamed(element: ReactElement) {
  return Object.assign(Promise.resolve(element), {
    status: 'fulfilled',
    value: element
  }) as unknown as ReactNode
}
