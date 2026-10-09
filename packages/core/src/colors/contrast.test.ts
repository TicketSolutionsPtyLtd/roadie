import { describe, expect, it } from 'vitest'

import { getContrastColor } from './contrast'

// Hexes are the shipped steps in tokens.css. APCA Lc for white and black text
// in the comment; the pick is the larger |Lc|.
const shippedSteps: ReadonlyArray<[string, string, 'white' | 'black']> = [
  ['light neutral 0', '#ffffff', 'black'], // 0 vs 106.0
  ['light neutral 5', '#d7e2ed', 'black'], // -17.8 vs 88.1
  ['light neutral 9', '#7b90a5', 'white'], // -65.7 vs 43.8
  ['light neutral 10', '#718598', 'white'], // -71.1 vs 38.5
  ['light neutral 13', '#0d1318', 'white'], // -107.3 vs 0
  ['light accent 9', '#0191eb', 'white'], // -65.7 vs 43.8
  ['light accent 10', '#0084d9', 'white'], // -71.7 vs 37.8
  ['light brand-secondary 9', '#ff8a5c', 'black'], // -50.2 vs 58.6
  ['light brand-secondary 10', '#f37f51', 'white'], // -56.0 vs 53.1
  ['light danger 9', '#ff6b5c', 'white'], // -58.3 vs 51.0
  ['light danger 10', '#f25f51', 'white'], // -63.9 vs 45.5
  ['light success 9', '#00c2b3', 'black'], // -48.3 vs 60.5
  ['light warning 9', '#e0ac00', 'black'], // -45.1 vs 63.5
  ['light info 8', '#b691e8', 'white'], // -55.1 vs 54.0
  ['light info 9', '#a96af1', 'white'], // -67.5 vs 42.0
  ['light info 10', '#9d5de3', 'white'], // -73.3 vs 36.3
  ['dark neutral 0', '#05080b', 'white'], // -107.8 vs 0
  ['dark neutral 9', '#5c7185', 'white'], // -80.3 vs 29.2
  ['dark neutral 10', '#697d91', 'white'], // -74.8 vs 34.7
  ['dark neutral 13', '#fafcff', 'black'], // 0 vs 104.1
  ['dark accent 10', '#0084dd', 'white'], // -71.5 vs 38.1
  ['dark success 9', '#00c2b3', 'black'], // -48.3 vs 60.5
  ['dark warning 9', '#fcc101', 'black'], // -31.9 vs 75.5
  ['dark info 12', '#f2eafe', 'black'] // -9.4 vs 95.5
]

const midTones: ReadonlyArray<[string, string, 'white' | 'black']> = [
  ['black', '#000000', 'white'],
  ['dark grey', '#333333', 'white'],
  ['grey #777', '#777777', 'white'], // -76.6 vs 33.0
  ['grey #999', '#999999', 'white'], // -59.9 vs 49.4
  ['light grey', '#cccccc', 'black'],
  ['pure red', '#ff0000', 'white'], // -69.6 vs 40.0
  ['green #00aa00', '#00aa00', 'white'], // -62.6 vs 46.8
  ['yellow', '#ffff00', 'black'],
  ['dark red', '#8b0000', 'white']
]

describe('getContrastColor', () => {
  it.each(shippedSteps)(
    'picks the text colour with the higher APCA contrast on %s (%s)',
    (_, background, expected) => {
      expect(getContrastColor(background)).toBe(expected)
    }
  )

  it.each(midTones)(
    'picks the text colour with the higher APCA contrast on %s (%s)',
    (_, background, expected) => {
      expect(getContrastColor(background)).toBe(expected)
    }
  )

  it('accepts uppercase hex', () => {
    expect(getContrastColor('#0091EB')).toBe('white')
  })
})
