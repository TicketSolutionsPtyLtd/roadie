import { describe, expect, it } from 'vitest'

import { getPageTitles } from './page-manifest'
import { toRoute } from './route'

describe('toRoute', () => {
  it('keys a trailing-slash URL as the route the manifest collects', async () => {
    const titles = await getPageTitles()
    expect(titles[toRoute('/components/')]).toBe(titles['/components'])
    expect(toRoute('/components/')).toBe('/components')
    expect(toRoute('/components/badge/')).toBe('/components/badge')
  })

  it('leaves a slashless route alone', () => {
    expect(toRoute('/components')).toBe('/components')
    expect(toRoute('/components/badge')).toBe('/components/badge')
  })

  it('keeps the root a single slash', () => {
    expect(toRoute('/')).toBe('/')
    expect(toRoute('//')).toBe('/')
  })
})
