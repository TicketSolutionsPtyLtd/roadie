// Subpath entry for `@oztix/roadie-components/card`.
//
// NO `'use client'` — server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { CardContent } from './CardContent'
import { CardDescription } from './CardDescription'
import { CardFooter } from './CardFooter'
import { CardHeader } from './CardHeader'
import { CardImage } from './CardImage'
import { CardRoot } from './CardRoot'
import { CardTitle } from './CardTitle'

const Card = CardRoot as typeof CardRoot & {
  Root: typeof CardRoot
  Header: typeof CardHeader
  Content: typeof CardContent
  Footer: typeof CardFooter
  Image: typeof CardImage
  Title: typeof CardTitle
  Description: typeof CardDescription
}

Card.Root = CardRoot
Card.Header = CardHeader
Card.Content = CardContent
Card.Footer = CardFooter
Card.Image = CardImage
Card.Title = CardTitle
Card.Description = CardDescription

export { Card }
export type { CardRootProps as CardProps } from './CardRoot'
export type { CardHeaderProps } from './CardHeader'
export type { CardContentProps } from './CardContent'
export type { CardFooterProps } from './CardFooter'
export type { CardImageProps } from './CardImage'
export type { CardTitleProps } from './CardTitle'
export type { CardDescriptionProps } from './CardDescription'
export { cardVariants } from './variants'
