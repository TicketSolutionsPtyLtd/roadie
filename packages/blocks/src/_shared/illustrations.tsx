import { Suspense, use } from 'react'

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

/** Whether saved content names a spot illustration. It's untrusted, and a prototype key such as `constructor` isn't one. */
export const isSpotIllustration = isSpotIllustrationName

// An SVG's own `name` attribute gives way to the illustration's.
type DrawingProps = Omit<SpotIllustrationComponentProps, 'name'>
type Props = DrawingProps & { name: SpotIllustrationName }

interface ByNameProps extends DrawingProps {
  /** The name saved content gives, checked here, since it's untrusted. */
  name: unknown
  /** Drawn when `name` names no illustration. With none, nothing is drawn. */
  fallback?: SpotIllustrationName
}

type Drawing = Awaited<ReturnType<typeof loadSpotIllustration>>

const drawings = new Map<SpotIllustrationName, Promise<Drawing>>()

// One promise per name, so every render passes `use` the same one. A server
// has every illustration loaded, and so may the page: that promise is marked
// settled the way React marks one it has seen settle, so `use` reads it at once.
function drawing(name: SpotIllustrationName) {
  let found = drawings.get(name)
  if (!found) {
    const loaded = loadedSpotIllustration(name)
    found = loaded
      ? Object.assign(Promise.resolve(loaded), {
          status: 'fulfilled',
          value: loaded
        })
      : loadSpotIllustration(name)
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
    <Suspense
      fallback={
        <svg
          aria-hidden
          viewBox='0 0 48 48'
          className={cn('size-12', props.className)}
        />
      }
    >
      <Drawn name={shown} {...props} />
    </Suspense>
  )
}
