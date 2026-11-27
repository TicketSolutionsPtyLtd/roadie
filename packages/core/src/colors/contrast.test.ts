import { describe, expect, it } from 'vitest'

import { getContrastColor } from './contrast'

// Hexes are tokens.css steps in sRGB, with accent 9 as the brand's hex. APCA
// Lc for white and black text in the comment; the pick is the larger |Lc|.
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

// Recorded from the colorjs.io version this function replaced, which agreed
// with it on all 16,777,216 six-digit hexes: every step of every scale's hex
// fallback in tokens.css, light then dark, sixteen greys, the corners and
// midpoints of the sRGB cube, then the eight hexes nearest the tie.
const recordedWhite = `
  #7b90a5 #718598 #475766 #16202a #0d1318 #0191eb #0084d9 #01538a #04365b
  #00172d #f37f51 #953601 #5f270f #2b0a00 #ff6b5c #f25f51 #a00207 #592b25
  #2c120e #006057 #02453f #00201d #735302 #483a1a #221906 #b691e8 #a96af1
  #9d5de3 #6d2fa9 #431e69 #1e0833 #05080b #0d1216 #161a1e #1c232a #232b32
  #28323c #2f3b46 #3a4957 #4d6377 #5c7185 #697d91 #020202 #09121b #0f1a24
  #0a2942 #00345b #01416d #114f7e #1f6094 #2674b3 #0084dd #15100d #1e1512
  #361a10 #4a1b07 #59230c #693019 #814027 #a65332 #160f0e #1f1412 #3a1410
  #50110d #611913 #71261f #8a362e #b3473d #0b1312 #101c1a #0b2d2a #003b36
  #024842 #0e5750 #146a61 #127f75 #13110b #1c180f #2c2208 #3c2900 #493300
  #564106 #69531a #856923 #130e1a #1c1426 #2c1b40 #392156 #442864 #503373
  #63428b #8155b5 #000000 #111111 #222222 #333333 #444444 #555555 #666666
  #777777 #888888 #999999 #000080 #0000ff #008000 #008080 #0080ff #800000
  #800080 #8000ff #808000 #808080 #8080ff #ff0000 #ff0080 #ff00ff #e78c51
  #e37fd5 #85af64 #84a9b5 #e07de7 #30ba41 #fc6cd0 #19ba59`
const recordedBlack = `
  #ffffff #fafcff #f5fafe #eaf1f7 #e1e9f1 #d7e2ed #cfdce8 #c1d1e1 #a9bfd3
  #f8fafc #f1f6fb #e4f0fb #d4e9fd #c2dffb #add2f5 #92c1ee #68aae6 #fcf9f8
  #fef2ee #ffe6db #ffd3bd #ffc3a8 #ffb290 #ff9e78 #f78255 #ff8a5c #fbf9f8
  #fdf2f1 #ffe6e2 #ffd2c9 #ffc2b7 #ffb4a9 #f5a296 #ea897c #f5fbfa #edf9f7
  #d4f6f1 #bbf2ea #a1eae0 #86ded3 #61cec1 #01baab #00c2b3 #00b6a8 #fefdf9
  #fffae6 #fff4ba #ffeb9e #ffe077 #ffd04f #f0c250 #deaa00 #e0ac00 #d5a101
  #faf9fc #f7f4fc #f1e9fd #eadefd #e1d1fb #d6c1f7 #c8acf0 #c6d6e6 #eaeff3
  #b2daff #e2f1ff #fbfdff #ffccb8 #ffe9e1 #fffbf9 #ffcac1 #fee9e6 #fefbfa
  #55eddc #b8fff4 #fbfffe #fcc101 #f1b700 #ffd35b #fee7b5 #fef4df #e4ccff
  #f2eafe #fcfbff #aaaaaa #bbbbbb #cccccc #dddddd #eeeeee #00ff00 #00ff80
  #00ffff #80ff00 #80ff80 #80ffff #ff8000 #ff8080 #ff80ff #ffff00 #ffff80
  #44addd #69b192 #8eab87 #d081ff #d57eff #23bb1e #be93d4 #f870cf`

// Alpha is ignored, and space around the hex is trimmed.
const hexForms: ReadonlyArray<[string, string, 'white' | 'black']> = [
  ['3 digits', '#f00', 'white'],
  ['3 digits', '#00f', 'white'],
  ['3 digits', '#789', 'white'],
  ['3 digits', '#0f0', 'black'],
  ['3 digits', '#ff0', 'black'],
  ['3 digits', '#abc', 'black'],
  ['4 digits', '#f00f', 'white'],
  ['4 digits', '#0000', 'white'],
  ['4 digits', '#ff08', 'black'],
  ['4 digits', '#fff0', 'black'],
  ['8 digits', '#ff0000ff', 'white'],
  ['8 digits', '#00000000', 'white'],
  ['8 digits', '#ffff0080', 'black'],
  ['8 digits', '#ffffff00', 'black'],
  ['uppercase', '#0091EB', 'white'],
  ['uppercase', '#FFC', 'black'],
  ['uppercase', '#ABCDEF80', 'black'],
  ['a leading space', ' #ff0000', 'white'],
  ['a trailing space', '#ffff00 ', 'black'],
  ['a tab and a newline', '\t#fff\n', 'black']
]

describe('getContrastColor', () => {
  it.each(recordedWhite.trim().split(/\s+/))(
    'still picks white text on %s',
    (background) => {
      expect(getContrastColor(background)).toBe('white')
    }
  )

  it.each(recordedBlack.trim().split(/\s+/))(
    'still picks black text on %s',
    (background) => {
      expect(getContrastColor(background)).toBe('black')
    }
  )

  it.each(hexForms)('reads a hex with %s (%j)', (_, background, expected) => {
    expect(getContrastColor(background)).toBe(expected)
  })

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

  it.each(['ff0000', '#ff000', '#ff00000', '#gggggg', '#', '', 'nonsense'])(
    'throws a TypeError for %j, which is no colour',
    (background) => {
      expect(() => getContrastColor(background)).toThrow(TypeError)
    }
  )

  it.each([
    'red',
    'transparent',
    'rgb(255 0 0)',
    'rgba(255, 0, 0, 0.5)',
    'hsl(0 100% 50%)',
    'hwb(0 0% 0%)',
    'lab(50 40 60)',
    'lch(50 60 40)',
    'oklab(0.6 0.1 0.1)',
    'oklch(0.639 0.19 250)',
    'color(srgb 1 0 0)'
  ])('throws a TypeError for %j, a colour that is not a hex', (background) => {
    expect(() => getContrastColor(background)).toThrow(TypeError)
  })

  it('names the input it could not read', () => {
    expect(() => getContrastColor('red')).toThrow('Invalid hex colour: red')
  })
})
