import { describe, expect, it } from 'vitest'

import {
  type SourceContext,
  getSourceLinks,
  pageComponents,
  sourcePath
} from './source-links'

const DOCS = 'https://ticketsolutionsptyltd.github.io/roadie'

const components = pageComponents([
  {
    package: '@oztix/roadie-components',
    components: [
      {
        name: 'IconButton',
        import: '@oztix/roadie-components/button',
        docs: `${DOCS}/components/icon-button/`
      },
      {
        name: 'Badge',
        import: '@oztix/roadie-components/badge',
        docs: `${DOCS}/components/badge/`
      },
      {
        name: 'RoadieProvider',
        import: '@oztix/roadie-components',
        docs: `${DOCS}/overview/getting-started/#4-mount-roadieprovider`
      },
      {
        name: 'ThemeProvider',
        import: '@oztix/roadie-components',
        docs: `${DOCS}/foundations/theming/`
      },
      {
        name: 'Mystery',
        import: '@oztix/roadie-components/mystery',
        docs: `${DOCS}/components/mystery/`
      }
    ]
  },
  {
    package: '@oztix/roadie-widgets',
    components: [
      {
        name: 'CartDrawer',
        import: '@oztix/roadie-widgets/cart-drawer/react',
        docs: `${DOCS}/roadie-widgets/cart-drawer/`
      }
    ]
  }
])

const REPO_PATHS: Record<string, 'tree' | 'blob'> = {
  'packages/components/src/components/Badge': 'tree',
  'packages/components/src/components/Button': 'tree',
  'packages/components/src/providers/ThemeProvider.tsx': 'blob',
  'packages/widgets/src/cart-drawer': 'tree'
}

const context: SourceContext = {
  pageFiles: new Map([
    ['/components/badge', 'docs/src/app/components/badge/page.mdx'],
    ['/foundations/theming', 'docs/src/app/foundations/theming/page.mdx'],
    ['/', 'docs/src/app/page.tsx'],
    ['/foundations/colour', 'docs/src/app/foundations/colour/page.mdx'],
    [
      '/overview/getting-started',
      'docs/src/app/overview/getting-started/page.mdx'
    ],
    ['/tokens/motion', 'docs/src/app/tokens/motion/page.tsx'],
    [
      '/overview/changelog/[release]',
      'docs/src/app/overview/changelog/[release]/page.tsx'
    ]
  ]),
  components,
  kindOf: (path) => REPO_PATHS[path]
}

describe('sourcePath', () => {
  it("links a component page to its folder and the page's own file", () => {
    expect(sourcePath('/components/badge', context)).toEqual({
      page: 'blob/main/docs/src/app/components/badge/page.mdx',
      code: 'tree/main/packages/components/src/components/Badge'
    })
  })

  it('finds a folder named for the import path when the component has none', () => {
    expect(sourcePath('/components/icon-button', context)?.code).toBe(
      'tree/main/packages/components/src/components/Button'
    )
    expect(sourcePath('/roadie-widgets/cart-drawer', context)?.code).toBe(
      'tree/main/packages/widgets/src/cart-drawer'
    )
  })

  it('links a provider to its file', () => {
    expect(sourcePath('/foundations/theming', context)).toEqual({
      page: 'blob/main/docs/src/app/foundations/theming/page.mdx',
      code: 'blob/main/packages/components/src/providers/ThemeProvider.tsx'
    })
  })

  it("falls back to the package's src folder", () => {
    expect(sourcePath('/components/mystery', context)?.code).toBe(
      'tree/main/packages/components/src'
    )
  })

  it('links any other page to its own file alone, mdx or tsx', () => {
    expect(sourcePath('/foundations/colour', context)).toEqual({
      page: 'blob/main/docs/src/app/foundations/colour/page.mdx'
    })
    expect(sourcePath('/tokens/motion', context)).toEqual({
      page: 'blob/main/docs/src/app/tokens/motion/page.tsx'
    })
    expect(sourcePath('/', context)).toEqual({
      page: 'blob/main/docs/src/app/page.tsx'
    })
  })

  it('ignores a component documented under an anchor on the page', () => {
    expect(sourcePath('/overview/getting-started', context)).toEqual({
      page: 'blob/main/docs/src/app/overview/getting-started/page.mdx'
    })
  })

  it("links a release to the release page's source", () => {
    expect(
      sourcePath('/overview/changelog/components-2-15-0', context)
    ).toEqual({
      page: 'blob/main/docs/src/app/overview/changelog/[release]/page.tsx'
    })
  })

  it('has nothing for an unknown route', () => {
    expect(sourcePath('/nowhere', context)).toBeUndefined()
  })
})

describe('getSourceLinks', () => {
  it('covers the homepage and every page, and none of the debug routes', () => {
    const links = getSourceLinks(['/overview/changelog/unreleased'])
    expect(links['/']).toEqual({ page: 'blob/main/docs/src/app/page.tsx' })
    expect(links['/foundations/layout']).toEqual({
      page: 'blob/main/docs/src/app/foundations/layout/page.mdx'
    })
    expect(links['/components/badge']).toEqual({
      page: 'blob/main/docs/src/app/components/badge/page.mdx',
      code: 'tree/main/packages/components/src/components/Badge'
    })
    expect(links['/overview/changelog/unreleased']).toEqual({
      page: 'blob/main/docs/src/app/overview/changelog/[release]/page.tsx'
    })
    expect(Object.keys(links).some((route) => route.startsWith('/debug'))).toBe(
      false
    )
  })
})
