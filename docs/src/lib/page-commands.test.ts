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
        pages: ['/components', '/components/navigation', '/components/tabs']
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

  it('names a category overview after its category', () => {
    const components = pageCommands(destinations)[1]!
    expect(components.items[1]!.label).toBe('Navigation overview')
  })
})
