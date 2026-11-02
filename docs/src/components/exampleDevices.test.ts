import { describe, expect, it } from 'vitest'

import { DEVICES, deviceWidth, fitScale } from './exampleDevices'

describe('deviceWidth', () => {
  it.each([
    ['phone', 375],
    ['tablet', 768],
    ['desktop', undefined]
  ] as const)('gives %s a width of %s', (device, width) => {
    expect(deviceWidth(device)).toBe(width)
  })

  it('lists the devices narrowest first, ending on desktop', () => {
    expect(DEVICES.map(({ value }) => value)).toEqual([
      'phone',
      'tablet',
      'desktop'
    ])
  })
})

describe('fitScale', () => {
  it.each([
    [375, 700, 1],
    [768, 768, 1],
    [768, 384, 0.5],
    [768, 0, 1]
  ])('scales a %spx frame in %spx to %s', (width, available, scale) => {
    expect(fitScale(width, available)).toBe(scale)
  })
})
