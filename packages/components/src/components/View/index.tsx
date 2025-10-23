import { View as ViewPattern } from '@oztix/roadie-core/jsx'

/**
 * A foundational layout component that provides a flexible container with sensible defaults.
 * Based on the Panda CSS Box pattern but with better defaults for application UI layout.
 *
 */
export const View = ViewPattern

export type ViewProps = React.ComponentProps<typeof ViewPattern>

View.displayName = 'View'
