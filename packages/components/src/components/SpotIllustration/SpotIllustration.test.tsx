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

    it('should have default size class', () => {
      const { container } = render(<Heart />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('size-12')
    })
  })

  describe('outline prop', () => {
    it('should render outline paths', () => {
      const { container } = render(<Ticket />)
      const outlinePaths = container.querySelectorAll('[data-part="outline"]')
      expect(outlinePaths.length).toBeGreaterThan(0)
    })
  })

  describe('className prop', () => {
    it('should accept custom className', () => {
      const { container } = render(<Heart className='custom-class' />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('custom-class')
    })

    it('should merge custom className with default classes', () => {
      const { container } = render(<Heart className='size-24' />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('size-24')
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
  })

  describe('different illustrations', () => {
    it('should render Heart illustration', () => {
      const { container } = render(<Heart />)
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('should render Ticket illustration', () => {
      const { container } = render(<Ticket />)
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('should render Hand illustration', () => {
      const { container } = render(<Hand />)
      expect(container.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('layer colors', () => {
    it('should use data-part attributes for styling', () => {
      const { container } = render(<Heart />)
      const paths = container.querySelectorAll('path')
      const dataParts = Array.from<Element>(paths)
        .map((path) => path.getAttribute('data-part'))
        .filter(Boolean)
      expect(dataParts.length).toBeGreaterThan(0)
    })
  })

  describe('accessibility', () => {
    it('should accept aria attributes', () => {
      const { container } = render(<Heart aria-label='Heart icon' />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('aria-label', 'Heart icon')
    })
  })
})
