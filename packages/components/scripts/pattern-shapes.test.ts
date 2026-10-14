import { describe, expect, it } from 'vitest'

import { extractPattern } from './pattern-shapes.mjs'

const exported = `<svg width="547" height="1080" viewBox="0 0 547 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="547" height="1080" fill="#FBFCFF"/>
<g id="Patterns">
<path d="M-230 -905H4521Z" fill="white"/>
<path d="M-228 -907V-906Z" fill="black"/>
<g id="Slide / Left" clip-path="url(#clip0)">
<rect width="547" height="1080" fill="#0091EB"/>
<g id="Pattern right">
<path d="M132 1010C356 1063Z" fill="#C2DFFB"/>
<path d="M62 874C268 972Z" fill="#c2dffb"/>
</g></g></g></svg>`

describe('extractPattern', () => {
  it('keeps only the swirl paths and the frame they were drawn in', () => {
    expect(extractPattern(exported)).toEqual({
      viewBox: '0 0 547 1080',
      paths: ['M132 1010C356 1063Z', 'M62 874C268 972Z']
    })
  })

  it('refuses a transformed group, which would move the swirl off its crop', () => {
    const moved = exported.replace(
      '<g id="Pattern right">',
      '<g id="Pattern right" transform="translate(4 0)">'
    )
    expect(() => extractPattern(moved)).toThrow(/transform/)
  })

  it('refuses a transformed swirl path', () => {
    const moved = exported.replace(
      'fill="#c2dffb"/>',
      'fill="#c2dffb" transform="scale(2)"/>'
    )
    expect(() => extractPattern(moved)).toThrow(/transform/)
  })

  it('refuses an export with no swirl paths', () => {
    expect(() =>
      extractPattern(exported.replaceAll(/#c2dffb/gi, '#000000'))
    ).toThrow(/no swirl/)
  })

  it('refuses an export with no viewBox', () => {
    expect(() =>
      extractPattern(exported.replace(' viewBox="0 0 547 1080"', ''))
    ).toThrow(/viewBox/)
  })
})
