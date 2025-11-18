import { forwardRef } from 'react'

import {
  SpotIllustration,
  type SpotIllustrationProps
} from './SpotIllustration'

type IllustrationJson = SpotIllustrationProps['illustration']

export type SpotIllustrationComponentProps = Omit<
  SpotIllustrationProps,
  'illustration'
>

/**
 * Factory function to create a SpotIllustration component from JSON data
 *
 * @param name - Display name for the component
 * @param data - JSON data imported from the json folder
 * @returns A React component that renders the spot illustration
 *
 * @example
 * ```tsx
 * import { createSpotIllustration } from './createSpotIllustration'
 * import noteMusicData from './json/note-music.json'
 *
 * export const NoteMusic = createSpotIllustration('NoteMusic', noteMusicData)
 * ```
 */
export function createSpotIllustration(name: string, data: unknown) {
  const Component = forwardRef<SVGSVGElement, SpotIllustrationComponentProps>(
    (props, ref) => {
      return (
        <SpotIllustration
          ref={ref}
          illustration={data as IllustrationJson}
          {...props}
        />
      )
    }
  )

  Component.displayName = name

  return Component
}
