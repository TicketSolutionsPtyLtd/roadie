import { describe, expect, it } from 'vitest'

import type { NavigationDestination } from '@/components/Navigation'

import { pageCommands } from './page-commands'

const destinations: NavigationDestination[] = [
  {
    title: 'Foundations',
    href: '/foundations',
    items: [
      { title: 'Foundations', href: '/foundations' },
      {
        title: 'Colour',
        href: '/foundations/colour',
        description: 'Semantic colour utilities'
      },
      { title: 'Coming soon' }
    ]
  },
  {
    title: 'Components',
    href: '/components',
    items: [],
    groups: [
      {
        name: 'Navigation',
        overviewHref: '/components/navigation',
        entries: [
          {
            name: 'tabs',
            title: 'Tabs',
            description: 'Switch between views',
            category: 'Navigation',
            href: '/components/tabs'
          },
          {
            name: 'link',
            title: 'Link',
            description: 'A routed anchor',
            category: 'Navigation',
            href: '/components/link',
            crossListedFrom: '/foundations'
          }
        ]
      },
      {
        name: 'Overlays',
        entries: [
          {
            name: 'dialog',
            title: 'Dialog',
            description: 'A modal window',
            category: 'Overlays',
            href: '/components/dialog'
          }
        ]
      }
    ]
  }
]

describe('pageCommands', () => {
  it('groups each section with its overview first, then its pages', () => {
    expect(
      pageCommands(destinations).map((group) => ({
        label: group.label,
        pages: group.items.map((item) => item.href)
      }))
    ).toEqual([
      {
        label: 'Foundations',
        pages: ['/foundations', '/foundations/colour']
      },
      {
        label: 'Components',
        pages: [
          '/components',
          '/components/navigation',
          '/components/tabs',
          '/components/dialog'
        ]
      }
    ])
  })

  it('matches a page by its description and its section', () => {
    const [foundations] = pageCommands(destinations)
    expect(foundations!.items[1]).toEqual({
      label: 'Colour',
      href: '/foundations/colour',
      keywords: ['Semantic colour utilities', 'Foundations']
    })
  })

  it('matches a page with no description by its section alone', () => {
    const [foundations] = pageCommands(destinations)
    expect(foundations!.items[0]!.keywords).toEqual(['Foundations'])
  })

  it('names a category overview after its category', () => {
    const components = pageCommands(destinations)[1]!
    expect(components.items[1]!.label).toBe('Navigation overview')
  })
})
