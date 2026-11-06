import { describe, expect, it } from 'vitest'

import { simulatedDark } from './EmailPreviewFrame'

describe('simulatedDark', () => {
  it.each([
    [
      'a head',
      '<!doctype html><html><head><title>x</title></head><body>x</body></html>',
      /<title>x<\/title><meta[^>]*><style>/
    ],
    [
      'no head',
      '<!doctype html><html lang="en"><body>x</body></html>',
      /^<!doctype html><html lang="en"><meta/
    ],
    [
      'only a doctype',
      '<!DOCTYPE html><body>x</body>',
      /^<!DOCTYPE html><meta/
    ],
    ['a fragment', '<p>x</p>', /^<meta[^>]*><style>.*<\/style><p>x<\/p>$/]
  ])(
    'adds its style to a page with %s, keeping any doctype first',
    (_, html, expected) => {
      expect(simulatedDark(html)).toMatch(expected)
    }
  )
})
