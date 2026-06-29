import { describe, expect, it } from 'vitest'

import {
  OZTIX_IMAGE_HOSTS,
  isOztixImageUrl,
  oztixImageAtWidth,
  oztixSrcSet
} from './image'

const OZTIX =
  'https://assets.oztix.com.au/image/1226ab55-3d53-47f0-ab4c-cddcf02bb001.png'
const CLOUDFRONT = 'https://d3fcfeclx4v047.cloudfront.net/image/abc.png'
const EXTERNAL = 'https://images.example.com/abc.png'

describe('isOztixImageUrl', () => {
  it('matches allowlisted hosts', () => {
    for (const host of OZTIX_IMAGE_HOSTS) {
      expect(isOztixImageUrl(`https://${host}/image/abc.png`)).toBe(true)
    }
  })

  it('rejects non-Oztix hosts', () => {
    expect(isOztixImageUrl(EXTERNAL)).toBe(false)
  })

  it('rejects relative and malformed URLs', () => {
    expect(isOztixImageUrl('/image/abc.png')).toBe(false)
    expect(isOztixImageUrl('not a url')).toBe(false)
    expect(isOztixImageUrl('')).toBe(false)
  })

  it('does not match subdomain spoofing', () => {
    expect(isOztixImageUrl('https://assets.oztix.com.au.evil.com/x.png')).toBe(
      false
    )
  })
})

describe('oztixImageAtWidth', () => {
  it('sets width and a webp format default', () => {
    const url = new URL(oztixImageAtWidth(OZTIX, 600))
    expect(url.searchParams.get('width')).toBe('600')
    expect(url.searchParams.get('format')).toBe('webp')
  })

  it('honours an explicit format', () => {
    const url = new URL(oztixImageAtWidth(OZTIX, 600, { format: 'jpg' }))
    expect(url.searchParams.get('format')).toBe('jpg')
  })

  it('adds autotrim=1 when requested, and omits it otherwise', () => {
    expect(oztixImageAtWidth(OZTIX, 600)).not.toContain('autotrim')
    const url = new URL(oztixImageAtWidth(OZTIX, 600, { autotrim: true }))
    expect(url.searchParams.get('autotrim')).toBe('1')
  })

  it('sets quality when provided', () => {
    const url = new URL(oztixImageAtWidth(OZTIX, 600, { quality: 70 }))
    expect(url.searchParams.get('quality')).toBe('70')
  })

  it('merges arbitrary params verbatim, applied last so they override', () => {
    const url = new URL(
      oztixImageAtWidth(OZTIX, 600, {
        params: { height: 350, rmode: 'crop', autoorient: true }
      })
    )
    expect(url.searchParams.get('height')).toBe('350')
    expect(url.searchParams.get('rmode')).toBe('crop')
    expect(url.searchParams.get('autoorient')).toBe('true')
    expect(url.searchParams.get('width')).toBe('600')
  })

  it('drops any pre-existing height so aspect ratio is preserved', () => {
    const url = new URL(oztixImageAtWidth(`${OZTIX}?width=300&height=150`, 600))
    expect(url.searchParams.get('width')).toBe('600')
    expect(url.searchParams.has('height')).toBe(false)
  })

  it('sets height for a crop when opts.height is given', () => {
    const url = new URL(oztixImageAtWidth(OZTIX, 600, { height: 300 }))
    expect(url.searchParams.get('width')).toBe('600')
    expect(url.searchParams.get('height')).toBe('300')
  })

  it('rounds fractional widths', () => {
    const url = new URL(oztixImageAtWidth(OZTIX, 599.6))
    expect(url.searchParams.get('width')).toBe('600')
  })

  it('preserves unrelated query params', () => {
    const url = new URL(oztixImageAtWidth(`${OZTIX}?v=2`, 600))
    expect(url.searchParams.get('v')).toBe('2')
  })

  it('rewrites every allowlisted host', () => {
    expect(oztixImageAtWidth(CLOUDFRONT, 600)).toContain('width=600')
  })

  it('passes non-Oztix URLs through untouched', () => {
    expect(oztixImageAtWidth(EXTERNAL, 600)).toBe(EXTERNAL)
  })

  it('is a no-op for non-positive or non-finite widths', () => {
    expect(oztixImageAtWidth(OZTIX, 0)).toBe(OZTIX)
    expect(oztixImageAtWidth(OZTIX, -100)).toBe(OZTIX)
    expect(oztixImageAtWidth(OZTIX, Number.NaN)).toBe(OZTIX)
    expect(oztixImageAtWidth(OZTIX, Number.POSITIVE_INFINITY)).toBe(OZTIX)
  })
})

describe('oztixSrcSet', () => {
  it('emits a width-descriptor srcSet', () => {
    const srcSet = oztixSrcSet(OZTIX, [600, 1200])
    expect(srcSet).toContain('width=600')
    expect(srcSet).toContain(' 600w')
    expect(srcSet).toContain('width=1200')
    expect(srcSet).toContain(' 1200w')
    expect(srcSet?.split(',').length).toBe(2)
  })

  it('sorts ascending and de-duplicates widths', () => {
    expect(oztixSrcSet(OZTIX, [1200, 600, 600])).toBe(
      `${oztixImageAtWidth(OZTIX, 600)} 600w, ${oztixImageAtWidth(OZTIX, 1200)} 1200w`
    )
  })

  it('threads autotrim through every srcSet entry', () => {
    const srcSet = oztixSrcSet(OZTIX, [600, 1200], { autotrim: true })!
    expect(srcSet.match(/autotrim=1/g)).toHaveLength(2)
  })

  it('returns undefined for non-Oztix URLs', () => {
    expect(oztixSrcSet(EXTERNAL, [600, 1200])).toBeUndefined()
  })

  it('returns undefined when no positive widths remain', () => {
    expect(oztixSrcSet(OZTIX, [])).toBeUndefined()
    expect(oztixSrcSet(OZTIX, [0, -100])).toBeUndefined()
  })
})
