// Generated from core’s CSS by src/utils/classFamilies.test.ts, over the rules in src/utils/classFamilies.ts. Run pnpm --filter @oztix/roadie-core test -u after changing a family’s CSS.
import type { DefaultClassGroupIds } from 'tailwind-merge'

export type RoadieClassGroupIds =
  | 'duration'
  | 'ease'
  | 'animate'
  | 'z'
  | 'font-size'
  | 'semantic-text-color'
  | 'semantic-bg-color'
  | 'semantic-border-color'
  | 'intent'
  | 'emphasis'
  | 'selection'
  | 'link'
  | 'prose-size'

type GroupId = RoadieClassGroupIds | DefaultClassGroupIds

export const classGroups: Record<RoadieClassGroupIds, string[]> = {
  duration: [
    'duration-instant',
    'duration-fastest',
    'duration-fast',
    'duration-normal',
    'duration-moderate',
    'duration-slow',
    'duration-slower',
    'duration-slowest'
  ],
  ease: [
    'ease-standard',
    'ease-enter',
    'ease-exit',
    'ease-spring',
    'ease-spring-lively'
  ],
  animate: [
    'animate-fade-in',
    'animate-scale-in',
    'animate-pop-in',
    'animate-pulse-subtle',
    'animate-shimmer',
    'animate-indeterminate',
    'animate-time-left',
    'animate-shake',
    'animate-nudge',
    'animate-pop',
    'animate-pop-tap'
  ],
  z: [
    'z-hide',
    'z-base',
    'z-docked',
    'z-sticky',
    'z-overlay',
    'z-modal',
    'z-popover',
    'z-toast',
    'z-tooltip',
    'z-alert'
  ],
  'font-size': [
    'text-display-ui',
    'text-display-ui-1',
    'text-display-ui-2',
    'text-display-ui-3',
    'text-display-ui-4',
    'text-display-ui-5',
    'text-display-ui-6',
    'text-display-prose',
    'text-display-prose-1',
    'text-display-prose-2',
    'text-display-prose-3',
    'text-display-prose-4',
    'text-display-prose-5',
    'text-display-prose-6',
    'text-ui',
    'text-ui-meta',
    'text-prose',
    'text-code'
  ],
  'semantic-text-color': [
    'text-normal',
    'text-subtler',
    'text-subtle',
    'text-strong',
    'text-inverted',
    'text-on-strong',
    'text-mark'
  ],
  'semantic-bg-color': [
    'bg-normal',
    'bg-subtler',
    'bg-subtle',
    'bg-strong',
    'bg-inverted',
    'bg-raised',
    'bg-sunken',
    'bg-mark',
    'surface-floating'
  ],
  'semantic-border-color': [
    'border-subtler',
    'border-subtle',
    'border-normal',
    'border-strong',
    'border-inverted'
  ],
  intent: [
    'intent-neutral',
    'intent-brand',
    'intent-brand-secondary',
    'intent-brand-purple',
    'intent-brand-blue',
    'intent-brand-orange',
    'intent-accent',
    'intent-danger',
    'intent-success',
    'intent-warning',
    'intent-info'
  ],
  emphasis: [
    'emphasis-strong',
    'emphasis-normal',
    'emphasis-subtle',
    'emphasis-subtler',
    'emphasis-inverted',
    'emphasis-raised',
    'emphasis-sunken',
    'emphasis-field',
    'emphasis-floating',
    'emphasis-overlay',
    'emphasis-overlay-subtle'
  ],
  selection: [
    'is-selected',
    'is-unselected',
    'is-selected-label',
    'is-selected-label-on-strong'
  ],
  link: [
    'link-normal',
    'link-strong',
    'link-subtle'
  ],
  'prose-size': [
    'prose-sm',
    'prose-lg'
  ]
}

// Both ways, so the later class wins whichever family each comes from.
export const conflictingClassGroups: Partial<Record<GroupId, GroupId[]>> = {
  'semantic-text-color': ['text-color'],
  'text-color': ['semantic-text-color'],
  'semantic-bg-color': ['bg-color'],
  'bg-color': ['semantic-bg-color'],
  'semantic-border-color': ['border-color'],
  'border-color': ['semantic-border-color']
}
