import { Container as ContainerPattern } from '@oztix/roadie-core/jsx'

/**
 * A foundational layout component that provides a centered container with responsive padding
 * and a constrained max-width by default. Perfect for page layouts and content sections.
 *
 * By default, Container has:
 * - Centered content with `mx: auto`
 * - Responsive horizontal padding (300 on mobile, 400 on tablet, 600 on desktop)
 * - Max-width constraint of 7xl (80rem)
 *
 * @example
 * ```tsx
 * // Basic usage - constrained width by default
 * <Container>
 *   <h1>Page Title</h1>
 *   <p>Content with readable max-width</p>
 * </Container>
 * ```
 *
 * @example
 * ```tsx
 * // Full-width container
 * <Container contain={false}>
 *   <h1>Hero Section</h1>
 *   <p>This content spans the full width</p>
 * </Container>
 * ```
 */
export const Container = ContainerPattern

export type ContainerProps = React.ComponentProps<typeof ContainerPattern>

Container.displayName = 'Container'
