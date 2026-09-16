import { createElement } from 'react'

import { describe, expect, it, vi } from 'vitest'

import type {
  PanePlace,
  PaneRegistration,
  PaneStackContextValue
} from '../Pane/PaneStackContext'
import {
  type HeldSlot,
  departed,
  drawnSlots,
  heldStack,
  slotsOf
} from './paneExit'

const element = (name: string, key?: string) =>
  createElement(name, key === undefined ? null : { key })

const keysOf = (children: unknown) =>
  slotsOf(children as never).map((slot) => slot.key)

describe('slotsOf', () => {
  it('numbers by place in the children, so an emptied slot renumbers nothing', () => {
    expect(keysOf([element('a'), element('b')])).toEqual(['.0', '.1'])
    expect(keysOf([element('a'), null])).toEqual(['.0'])
    // The route segment is the second child; a leading pane dropping must not
    // hand its key to the one that stayed.
    expect(keysOf([null, element('b')])).toEqual(['.1'])
  })

  it('keeps an explicit key, so a caller can say what identity a slot has', () => {
    expect(keysOf([element('a', 'x'), element('b', 'y')])).toEqual([
      '.$x',
      '.$y'
    ])
  })
})

describe('departed', () => {
  const slot = (key: string) => ({ key, node: null })

  it('reports the slots the new children no longer draw, with where they sat', () => {
    expect(departed([slot('.0'), slot('.1')], [slot('.0')])).toEqual([
      { key: '.1', node: null, at: 1 }
    ])
  })

  it('reports nothing when a slot is replaced rather than dropped', () => {
    expect(
      departed([slot('.0'), slot('.1')], [slot('.0'), slot('.1')])
    ).toEqual([])
  })

  it('reports a slot whose key changed, which is a step, not a swap', () => {
    expect(departed([slot('.$root')], [slot('.$child')])).toEqual([
      { key: '.$root', node: null, at: 0 }
    ])
  })
})

describe('drawnSlots', () => {
  const held = (key: string, at: number) =>
    ({ key, node: null, at, exit: 'ahead' }) as HeldSlot

  it('puts a held slot back where it sat, so its element never moves', () => {
    const live = [{ key: '.0', node: null }]
    expect(drawnSlots(live, [held('.1', 1)]).map((slot) => slot.key)).toEqual([
      '.0',
      '.1'
    ])
  })

  it('draws a held slot before the one that replaced it at the same place', () => {
    const live = [{ key: '.$child', node: null }]
    expect(
      drawnSlots(live, [held('.$root', 0)]).map((slot) => slot.key)
    ).toEqual(['.$root', '.$child'])
  })

  it('keeps several in their own order', () => {
    const live = [{ key: '.0', node: null }]
    expect(
      drawnSlots(live, [held('.2', 2), held('.1', 1)]).map((slot) => slot.key)
    ).toEqual(['.0', '.1', '.2'])
  })
})

describe('heldStack', () => {
  const entry: PaneRegistration = {
    role: 'detail',
    current: true,
    primaryNav: 'auto',
    kind: 'pane'
  }
  const place: PanePlace = {
    position: 'top',
    depth: 2,
    chrome: {},
    isRoot: false
  }
  const live = (): PaneStackContextValue => ({
    register: vi.fn(),
    unregister: vi.fn(),
    placeOf: vi.fn(() => place),
    markPushing: vi.fn(),
    moreOpen: false,
    level: 0,
    destination: '/a/1'
  })

  it('keeps the pane out of the register, so the live row stops counting it', () => {
    const stack = live()
    const leaving = heldStack(stack, 'ahead')
    leaving.register('id', document.createElement('div'), entry)
    leaving.unregister('id')
    leaving.markPushing()
    expect(stack.register).not.toHaveBeenCalled()
    expect(stack.unregister).not.toHaveBeenCalled()
    expect(stack.markPushing).not.toHaveBeenCalled()
  })

  it('takes the place it had once, and says which way it goes', () => {
    const stack = live()
    const leaving = heldStack(stack, 'ahead')
    expect(leaving.placeOf('id', entry)).toEqual({ ...place, exit: 'ahead' })
    expect(leaving.placeOf('id', entry)).toEqual({ ...place, exit: 'ahead' })
    // Asked while the pane was still in the stack; the answer is kept from then.
    expect(stack.placeOf).toHaveBeenCalledOnce()
  })

  it('keeps the destination it left on, so the pane never scrolls itself back', () => {
    expect(heldStack(live(), 'behind').destination).toBe('/a/1')
  })
})
