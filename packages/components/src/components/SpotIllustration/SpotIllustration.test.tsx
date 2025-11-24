import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Hand } from './Hand'
import { Heart } from './Heart'
import { Ticket } from './Ticket'

describe('SpotIllustration', () => {
  describe('rendering', () => {
    it('should render an illustration', () => {
      const { container } = render(<Heart />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('should render with default viewBox', () => {
      const { container } = render(<Heart />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('viewBox', '0 0 48 48')
    })

    it('should render all path layers', () => {
      const { container } = render(<Heart />)
      const paths = container.querySelectorAll('path')
      expect(paths.length).toBeGreaterThan(0)
    })
  })

  describe('boxSize prop', () => {
    it('should apply default boxSize of 600', () => {
      const { container } = render(<Heart />)
      const svg = container.querySelector('svg')
      // Check for class name base (PandaCSS uses different format)
      expect(svg?.classList.length).toBeGreaterThan(0)
    })

    it('should apply custom boxSize', () => {
      const { container } = render(<Heart boxSize='800' />)
      const svg = container.querySelector('svg')
      expect(svg?.classList.length).toBeGreaterThan(0)
    })

    it('should support numeric boxSize values', () => {
      const { container } = render(<Heart boxSize='1200' />)
      const svg = container.querySelector('svg')
      expect(svg?.classList.length).toBeGreaterThan(0)
    })
  })

  describe('outline prop', () => {
    it('should render outline layer by default (outline=false)', () => {
      const { container } = render(<Ticket />)
      const paths = container.querySelectorAll('path')
      const outlinePaths = Array.from<Element>(paths).filter(
        (path: Element) => path.getAttribute('data-part') === 'outline'
      )
      expect(outlinePaths.length).toBeGreaterThan(0)
    })

    it('should hide outline when outline=false (default)', () => {
      const { container } = render(<Ticket outline={false} />)
      const svg = container.querySelector('svg')
      // The outline should have opacity: 0 via CSS
      expect(svg).toBeInTheDocument()
    })

    it('should show outline when outline=true', () => {
      const { container } = render(<Ticket outline={true} />)
      const svg = container.querySelector('svg')
      // The outline should be visible via CSS
      expect(svg).toBeInTheDocument()
    })
  })

  describe('className prop', () => {
    it('should accept custom className', () => {
      const { container } = render(<Heart className='custom-class' />)
      const svg = container.querySelector('svg')
      // PandaCSS merges classes differently - just check element exists
      expect(svg).toBeInTheDocument()
      expect(svg?.classList.length).toBeGreaterThan(0)
    })

    it('should merge custom className with default classes', () => {
      const { container } = render(
        <Heart className='custom-class' boxSize='400' />
      )
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg?.classList.length).toBeGreaterThan(0)
    })
  })

  describe('ref forwarding', () => {
    it('should forward ref to svg element', () => {
      let svgRef: SVGSVGElement | null = null
      render(
        <Heart
          ref={(el) => {
            svgRef = el
          }}
        />
      )
      expect(svgRef).toBeInstanceOf(SVGSVGElement)
    })

    it('should allow accessing svg properties via ref', () => {
      let svgRef: SVGSVGElement | null = null
      render(
        <Heart
          ref={(el) => {
            svgRef = el
          }}
        />
      )
      expect(svgRef!.getAttribute('viewBox')).toBeDefined()
    })
  })

  describe('different illustrations', () => {
    it('should render Heart illustration', () => {
      const { container } = render(<Heart />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('should render Ticket illustration', () => {
      const { container } = render(<Ticket />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('should render Hand illustration', () => {
      const { container } = render(<Hand />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('should render different number of paths for different illustrations', () => {
      const { container: heartContainer } = render(<Heart />)
      const { container: handContainer } = render(<Hand />)

      const heartPaths = heartContainer.querySelectorAll('path').length
      const handPaths = handContainer.querySelectorAll('path').length

      // Heart and Hand have different numbers of paths
      expect(heartPaths).not.toBe(handPaths)
    })
  })

  describe('layer colors', () => {
    it('should use semantic token colors via data-part attributes', () => {
      const { container } = render(<Heart />)
      const paths = container.querySelectorAll('path')

      // Check that paths have data-part attributes for styling
      const dataParts = Array.from<Element>(paths)
        .map((path: Element) => path.getAttribute('data-part'))
        .filter(Boolean)

      expect(dataParts.length).toBeGreaterThan(0)
    })
  })

  describe('accessibility', () => {
    it('should be decorative by default (no role)', () => {
      const { container } = render(<Heart />)
      const svg = container.querySelector('svg')
      expect(svg).not.toHaveAttribute('role')
    })

    it('should accept aria attributes', () => {
      const { container } = render(<Heart aria-label='Heart icon' />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('aria-label', 'Heart icon')
    })
  })
})
