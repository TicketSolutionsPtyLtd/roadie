import { describe, expect, it } from 'vitest'

import { type DrawerState, createDrawerDrag } from './drawer'

const pointer = (type: string, clientY: number, pointerId = 1) =>
  Object.assign(new Event(type), { clientY, pointerId })

/** A drawer docked at 100px and open at 700px, pressed at y 600. */
function setup(
  from: DrawerState = 'closed',
  bounds = { closedHeight: 100, maxHeight: 700 }
) {
  const target = new EventTarget()
  const drawer = { time: 0, height: from === 'open' ? 700 : 100 }
  const heights: number[] = []
  const rests: DrawerState[] = []
  const controller = createDrawerDrag(target, () => drawer.time)
  const press = (pointerId = 1) =>
    controller.start({
      pointer: { pointerId, clientY: 600 },
      wasOpen: from === 'open',
      getHeight: () => drawer.height,
      setHeight: (px) => {
        drawer.height = px
        heights.push(px)
      },
      bounds: () => bounds,
      onRelease: (to) => rests.push(to)
    })
  const move = (y: number, at: number, pointerId = 1) => {
    drawer.time = at
    target.dispatchEvent(pointer('pointermove', y, pointerId))
  }
  const release = (y: number, pointerId = 1, type = 'pointerup') =>
    target.dispatchEvent(pointer(type, y, pointerId))
  return { controller, drawer, heights, rests, press, move, release }
}

describe('createDrawerDrag', () => {
  it.each([
    ['a tap opens a docked drawer', 'closed', [], 'open'],
    ['a tap closes an open drawer', 'open', [], 'closed'],
    ['a 4px wobble still counts as a tap', 'closed', [[596, 100]], 'open'],
    ['a slow short drag falls back', 'closed', [[400, 1000]], 'closed'],
    ['a slow drag past halfway opens', 'closed', [[200, 1000]], 'open'],
    ['an upward flick opens', 'closed', [[580, 10]], 'open'],
    ['a downward flick closes', 'open', [[620, 10]], 'closed'],
    ['a slow drag down a little stays open', 'open', [[700, 1000]], 'open']
  ] as const)('%s', (_, from, moves, rest) => {
    const drag = setup(from)
    drag.press()
    for (const [y, at] of moves) drag.move(y, at)
    drag.release(moves.at(-1)?.[0] ?? 600)
    expect(drag.rests).toEqual([rest])
  })

  it('follows the pointer between the docked and open heights', () => {
    const drag = setup()
    drag.press()
    drag.move(500, 100)
    drag.move(-400, 200)
    drag.move(900, 300)
    expect(drag.heights).toEqual([200, 700, 100])
  })

  it('reads the bounds on every move, so a resize mid-drag re-clamps it', () => {
    const bounds = { closedHeight: 100, maxHeight: 700 }
    const drag = setup('closed', bounds)
    drag.press()
    drag.move(0, 100)
    bounds.maxHeight = 500
    drag.move(0, 200)
    expect(drag.heights).toEqual([700, 500])
  })

  it('settles a cancelled pointer as if it were released', () => {
    const drag = setup()
    drag.press()
    drag.move(200, 1000)
    drag.release(200, 1, 'pointercancel')
    expect(drag.rests).toEqual(['open'])
  })

  it('ignores a second pointer while the first one drags', () => {
    const drag = setup()
    expect(drag.press(1)).toBe(true)
    expect(drag.press(2)).toBe(false)
    drag.move(500, 100, 2)
    drag.release(500, 2)
    expect([drag.drawer.height, drag.rests]).toEqual([100, []])
    drag.release(600, 1)
    expect(drag.rests).toEqual(['open'])
    expect(drag.press(2)).toBe(true)
  })

  it('stops following the pointer once disposed', () => {
    const drag = setup()
    drag.press()
    drag.controller.dispose()
    drag.move(300, 100)
    drag.release(300)
    expect([drag.drawer.height, drag.rests]).toEqual([100, []])
  })
})
