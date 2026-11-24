import { type ReactElement, Suspense, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'
import type { SpotIllustrationComponentProps } from '@oztix/roadie-illustrations/spot'
import {
  type SpotIllustrationName,
  isSpotIllustrationName,
  loadSpotIllustration,
  loadedSpotIllustration
} from '@oztix/roadie-illustrations/spot/load'

/**
 * Any spot illustration's name, such as `Ticket` or `Number1`, as a CMS stores it. A picker
 * lists them, with labels and tags, from `@oztix/roadie-illustrations/spot/catalogue`.
 */
export type { SpotIllustrationName }

// Saved content is untrusted, and a prototype key such as `constructor` isn't an illustration.
const isSpotIllustration = isSpotIllustrationName

// An SVG's own `name` attribute gives way to the illustration's.
type DrawingProps = Omit<SpotIllustrationComponentProps, 'name'>
type Props = DrawingProps & { name: SpotIllustrationName }

interface ByNameProps extends DrawingProps {
  /** The name saved content gives, checked here, since it's untrusted. */
  name: unknown
  /** Drawn when `name` names no illustration. With none, nothing is drawn. */
  fallback?: SpotIllustrationName
}

type Drawing = (props: DrawingProps) => ReactElement

// The box the illustration takes, held while it loads, or for good if it fails.
function Reserved({ className }: DrawingProps) {
  return (
    <svg aria-hidden viewBox='0 0 48 48' className={cn('size-12', className)} />
  )
}

const drawings = new Map<SpotIllustrationName, Promise<Drawing>>()

// One promise per name, so every render passes `use` the same one. A server
// has every illustration loaded, and so may the page: that promise is marked
// settled the way React marks one it has seen settle, so `use` reads it at once
// (React's thenable protocol; the hydration browser test fails if it changes).
// A failed load, such as a chunk gone after a deploy, keeps the box and the
// block; it isn't retried until the page reloads, so a render can't loop on it.
function drawing(name: SpotIllustrationName) {
  let found = drawings.get(name)
  if (!found) {
    const loaded = loadedSpotIllustration(name)
    found = loaded
      ? Object.assign(Promise.resolve(loaded), {
          status: 'fulfilled',
          value: loaded
        })
      : loadSpotIllustration(name).catch((): Drawing => Reserved)
    drawings.set(name, found)
  }
  return found
}

function Drawn({ name, ...props }: Props) {
  const Drawing = use(drawing(name))
  return <Drawing {...props} />
}

/**
 * The spot illustration a block names, or `fallback`'s when the name is none of them. Saved
 * content can name any of them, so each loads on its own, in a box held at its size, rather
 * than every block carrying the whole set.
 */
export function SpotIllustrationByName({
  name,
  fallback,
  ...props
}: ByNameProps) {
  const shown = isSpotIllustration(name) ? name : fallback
  if (!shown) return null
  return (
    <Suspense fallback={<Reserved className={props.className} />}>
      <Drawn name={shown} {...props} />
    </Suspense>
  )
}
