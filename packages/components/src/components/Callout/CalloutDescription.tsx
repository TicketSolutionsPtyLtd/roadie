import type { ComponentProps } from 'react'

export type CalloutDescriptionProps = ComponentProps<'div'>

/** The body. A `div`, so it can hold paragraphs, links and lists. */
export function CalloutDescription({
  className,
  ...props
}: CalloutDescriptionProps) {
  return (
    <div data-slot='callout-description' className={className} {...props} />
  )
}

CalloutDescription.displayName = 'Callout.Description'
