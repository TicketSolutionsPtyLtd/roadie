import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge<
  'semantic-text-color' | 'semantic-bg-color' | 'semantic-border-color'
>({
  extend: {
    classGroups: {
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
