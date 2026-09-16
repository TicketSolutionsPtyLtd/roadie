import { describe, expect, it } from 'vitest'

import {
  NAVIGATOR_EXPANDED_ATTRIBUTE,
  NAVIGATOR_EXPANDED_COOKIE,
  getNavigatorExpandedScript,
  serializeNavigatorExpandedCookie
} from './index'

const runWith = (cookie: string, script = getNavigatorExpandedScript()) => {
  let attribute: string | null = null
  const document = {
    cookie,
    documentElement: {
      setAttribute: (name: string, value: string) => {
        if (name === NAVIGATOR_EXPANDED_ATTRIBUTE) attribute = value
      },
      removeAttribute: (name: string) => {
        if (name === NAVIGATOR_EXPANDED_ATTRIBUTE) attribute = null
      }
    }
  }
  new Function('document', script)(document)
  return attribute
}

describe('getNavigatorExpandedScript', () => {
  it('marks the document when the cookie says expanded', () => {
    expect(runWith(`a=1; ${NAVIGATOR_EXPANDED_COOKIE}=1`)).toBe('')
  })

  it('leaves it unmarked otherwise', () => {
    expect(runWith(`${NAVIGATOR_EXPANDED_COOKIE}=0`)).toBeNull()
    expect(runWith('')).toBeNull()
  })

  it('never throws at runtime', () => {
    expect(() =>
      new Function('document', getNavigatorExpandedScript())(undefined)
    ).not.toThrow()
  })
})

describe('serializeNavigatorExpandedCookie', () => {
  it('writes a year-long, site-wide, lax cookie', () => {
    expect(serializeNavigatorExpandedCookie(true)).toBe(
      `${NAVIGATOR_EXPANDED_COOKIE}=1; path=/; max-age=31536000; samesite=lax`
    )
  })
})
