'use client'

import { Fragment, useId } from 'react'

import { InfoIcon } from '@phosphor-icons/react'

import { IconButton } from '../Button/IconButton'
import { Link } from '../Link'
import type { MapAttribution } from './engine'

type MapCreditsProps = {
  attribution: readonly MapAttribution[]
  /** Folded behind the info button. Only a narrow map folds them. */
  collapsed: boolean
  onToggle: () => void
}

/**
 * The tiles' credits, in the map's corner. They show on load, as
 * OpenStreetMap's attribution guidelines ask. On a narrow map they fold
 * behind an info button once the map moves or after a few seconds, and the
 * button opens them again.
 */
export function MapCredits({
  attribution,
  collapsed,
  onToggle
}: MapCreditsProps) {
  const id = useId()
  // An engine that draws its own credits, as Google does, lists none here.
  if (attribution.length === 0) return null
  return (
    <div
      data-slot='map-credits'
      data-collapsed={collapsed || undefined}
      className='group/credits absolute right-(--map-credits-right) bottom-(--map-credits-bottom) z-10 flex items-end gap-1 p-1'
    >
      <p
        id={id}
        className='rounded-sm is-translucent bg-raised px-1 text-xs/4 text-subtle @max-md:group-data-collapsed/credits:hidden'
      >
        {attribution.map(({ label, href }, index) => (
          <Fragment key={label}>
            {index > 0 && ' · '}
            {href ? (
              <Link href={href} emphasis='subtle' className='text-subtle'>
                {label}
              </Link>
            ) : (
              <span>{label}</span>
            )}
          </Fragment>
        ))}
      </p>
      <IconButton
        size='xs'
        emphasis='subtler'
        aria-label='Map credits'
        aria-expanded={!collapsed}
        aria-controls={id}
        onClick={onToggle}
        className='hidden is-translucent bg-raised text-subtle @max-md:inline-flex'
      >
        <InfoIcon weight='bold' className='size-4' />
      </IconButton>
    </div>
  )
}
