import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge<
  | 'semantic-text-color'
  | 'semantic-bg-color'
  | 'semantic-border-color'
  | 'intent'
  | 'emphasis'
>({
  extend: {
    classGroups: {
      // Roadie ships named duration tokens (`duration-fast` etc.) as
      // explicit `@utility` blocks in `motion.css`. Tailwind v4 doesn't
      // auto-extend `--duration-*` into utilities the way it does
      // `--ease-*`, so tailwind-merge's built-in `transition-duration`
      // group only covers the numeric `duration-150` / `duration-300`
      // forms. Register the named tokens here so consumer overrides
      // (`<Component className='duration-fast' />`) deduplicate
      // against the wrapper's baked-in duration class.
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
      // Same story for the named easing tokens — Tailwind v4 emits
      // the utilities, but tailwind-merge needs them registered to
      // dedup `ease-enter` against `ease-exit` etc.
      ease: ['ease-standard', 'ease-enter', 'ease-exit', 'ease-spring'],
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
        'text-inverted'
      ],
      'semantic-bg-color': [
        'bg-normal',
        'bg-subtle',
        'bg-subtler',
        'bg-strong',
        'bg-inverted',
        'bg-raised',
        'bg-sunken'
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
        'emphasis-floating',
        'emphasis-inverted',
        'emphasis-overlay'
      ]
    },
    conflictingClassGroups: {
      'semantic-text-color': ['text-color'],
      'semantic-bg-color': ['bg-color'],
      'semantic-border-color': ['border-color']
    }
  }
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
