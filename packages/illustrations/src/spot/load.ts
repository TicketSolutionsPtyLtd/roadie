import type { ReactElement } from 'react'

import type { SpotIllustrationComponentProps } from './SpotIllustration'
import { SPOT_ILLUSTRATION_LOADERS as LOADERS } from './loaders'

/** Any spot illustration's component name, such as `Ticket` or `Number1`. */
export type SpotIllustrationName = keyof typeof LOADERS

/** A spot illustration's component, as `@oztix/roadie-illustrations/spot` exports it. */
export type SpotIllustrationComponent = ((
  props: SpotIllustrationComponentProps
) => ReactElement) & { displayName: string }

const loaded = new Map<SpotIllustrationName, SpotIllustrationComponent>()
const loading = new Map<
  SpotIllustrationName,
  Promise<SpotIllustrationComponent>
>()

/** Whether a value, such as a name saved in a CMS, names a spot illustration. */
export const isSpotIllustrationName = (
  name: unknown
): name is SpotIllustrationName =>
  typeof name === 'string' && Object.hasOwn(LOADERS, name)

/** The named illustration once it has loaded, so a render can draw it without waiting. */
export const loadedSpotIllustration = (
  name: SpotIllustrationName
): SpotIllustrationComponent | undefined => loaded.get(name)

/** Loads one spot illustration by name, without the rest of the set. Each loads once. */
export function loadSpotIllustration(
  name: SpotIllustrationName
): Promise<SpotIllustrationComponent> {
  const started = loading.get(name)
  if (started) return started
  const load = LOADERS[name]().then((module) => {
    const drawn = (
      module as Record<SpotIllustrationName, SpotIllustrationComponent>
    )[name]
    loaded.set(name, drawn)
    return drawn
  })
  // A module that fails to load, such as a chunk gone after a deploy, loads again next time.
  load.catch(() => loading.delete(name))
  loading.set(name, load)
  return load
}
