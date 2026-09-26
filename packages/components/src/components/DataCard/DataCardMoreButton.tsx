import { DotsThreeIcon } from '@phosphor-icons/react/ssr'

import { IconButton, type IconButtonProps } from '../Button/IconButton'

export type DataCardMoreButtonProps = Omit<
  IconButtonProps,
  'aria-label' | 'children' | 'size' | 'emphasis'
> & {
  /** The card's label. The button is named "More actions for {label}". */
  label: string
}

/**
 * The More button at the end of a card's actions. It spreads every other
 * prop and the ref onto the button, so it can be a menu trigger's `render`.
 * As a `Menu.Trigger` render, its `data-slot` becomes the trigger's.
 */
export function DataCardMoreButton({
  label,
  ...props
}: DataCardMoreButtonProps) {
  return (
    <IconButton
      data-slot='data-card-more'
      aria-label={`More actions for ${label}`}
      size='sm'
      emphasis='subtler'
      {...props}
    >
      <DotsThreeIcon weight='bold' className='size-4' />
    </IconButton>
  )
}
DataCardMoreButton.displayName = 'DataCard.MoreButton'
