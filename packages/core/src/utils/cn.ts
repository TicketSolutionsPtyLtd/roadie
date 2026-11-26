import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

import {
  type RoadieClassGroupIds,
  classGroups,
  conflictingClassGroups
} from './classGroups.generated'

// The groups are generated from core's CSS: see classFamilies.ts.
const twMerge = extendTailwindMerge<RoadieClassGroupIds>({
  extend: { classGroups, conflictingClassGroups }
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
