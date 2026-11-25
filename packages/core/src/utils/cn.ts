import { type ClassValue, clsx } from 'clsx'
import {
  type ConfigExtension,
  type DefaultClassGroupIds,
  type DefaultThemeGroupIds,
  extendTailwindMerge
} from 'tailwind-merge'

type RoadieClassGroupIds =
  | 'semantic-text-color'
  | 'semantic-bg-color'
  | 'semantic-border-color'
  | 'intent'
  | 'emphasis'
  | 'selection'
  | 'link'
  | 'prose-size'

// Exported so classFamilies.test.ts can check each group against core's CSS.
export const mergeConfig = {
  extend: {
    classGroups: {
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
        'animate-shake',
        'animate-nudge',
        'animate-pop',
        'animate-pop-tap',
        'animate-time-left'
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
        {
          text: [
            'display-ui',
            'display-ui-1',
            'display-ui-2',
            'display-ui-3',
            'display-ui-4',
            'display-ui-5',
            'display-ui-6',
            'display-prose',
            'display-prose-1',
            'display-prose-2',
            'display-prose-3',
            'display-prose-4',
            'display-prose-5',
            'display-prose-6',
            'ui',
            'ui-meta',
            'prose',
            'code'
          ]
        }
      ],
      'semantic-text-color': [
        'text-normal',
        'text-subtle',
        'text-subtler',
        'text-strong',
        'text-inverted',
        'text-on-strong',
        'text-mark'
      ],
      'semantic-bg-color': [
        'bg-normal',
        'bg-subtle',
        'bg-subtler',
        'bg-strong',
        'bg-inverted',
        'bg-raised',
        'bg-sunken',
        'bg-mark',
        'surface-floating'
      ],
      'semantic-border-color': [
        'border-subtle',
        'border-subtler',
        'border-normal',
        'border-strong',
        'border-inverted'
      ],
      intent: [
        'intent-neutral',
        'intent-brand',
        'intent-brand-secondary',
        'intent-brand-blue',
        'intent-brand-orange',
        'intent-brand-purple',
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
        'emphasis-raised',
        'emphasis-sunken',
        'emphasis-field',
        'emphasis-floating',
        'emphasis-inverted',
        'emphasis-overlay',
        'emphasis-overlay-subtle'
      ],
      selection: [
        'is-unselected',
        'is-selected',
        'is-selected-label',
        'is-selected-label-on-strong'
      ],
      link: ['link-normal', 'link-strong', 'link-subtle'],
      'prose-size': ['prose-sm', 'prose-lg']
    },
    conflictingClassGroups: {
      'semantic-text-color': ['text-color'],
      'semantic-bg-color': ['bg-color'],
      'semantic-border-color': ['border-color']
    }
  }
} satisfies ConfigExtension<
  RoadieClassGroupIds | DefaultClassGroupIds,
  DefaultThemeGroupIds
>

const twMerge = extendTailwindMerge<RoadieClassGroupIds>(mergeConfig)

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
