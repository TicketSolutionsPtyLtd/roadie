import type { BlockDefinition } from '../catalogue'
import type { StatItem, StatsProps } from './index'

export const statsDefinition = {
  name: 'stats',
  title: 'Stats',
  description: 'Use it when three to six numbers make the point on their own.',
  group: 'prove',
  presets: [
    {
      name: 'figures',
      title: 'Figures',
      description:
        'A heading over a wrapping row of figures, such as company facts, results, or a local audience.',
      fields: [
        'id',
        'eyebrow',
        'title',
        'highlight',
        'description',
        'stats',
        'actions',
        'intent',
        'emphasis',
        'contained',
        'align',
        'size'
      ],
      itemFields: ['value', 'label', 'illustration'],
      limits: { stats: { min: 3, max: 6 } },
      defaults: { align: 'start', contained: true }
    }
  ]
} as const satisfies BlockDefinition<
  keyof StatsProps & string,
  keyof StatItem & string
>

/** A Stats preset's name. */
export type StatsPreset = (typeof statsDefinition.presets)[number]['name']
