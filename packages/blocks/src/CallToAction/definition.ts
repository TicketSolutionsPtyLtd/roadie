import type { BlockDefinition } from '../catalogue'
import type { CallToActionProps } from './index'

const ACTIONS = { actions: { max: 2 } } as const

export const callToActionDefinition = {
  name: 'call-to-action',
  title: 'Call to action',
  description: 'Use it last on a page, to give the next step.',
  group: 'close',
  keywords: ['cta', 'banner', 'button', 'sign up'],
  presets: [
    {
      name: 'photo',
      title: 'Photo',
      description:
        'A pitch and its actions on a panel, beside a tilted portrait photo that breaks out of the top, such as the Studio call to action.',
      fields: [
        'preset',
        'id',
        'eyebrow',
        'title',
        'highlight',
        'description',
        'body',
        'actions',
        'image',
        'ratio',
        'tilted',
        'illustration',
        'intent',
        'emphasis',
        'contained',
        'align',
        'size'
      ],
      limits: ACTIONS,
      defaults: { emphasis: 'raised', align: 'start', ratio: 'portrait' }
    },
    {
      name: 'centred',
      title: 'Centred',
      description:
        'A pitch and its actions centred on a panel, with no photo, such as “Talk to us”.',
      fields: [
        'preset',
        'id',
        'eyebrow',
        'title',
        'highlight',
        'description',
        'body',
        'actions',
        'intent',
        'emphasis',
        'contained',
        'align',
        'size'
      ],
      limits: ACTIONS,
      defaults: { emphasis: 'raised', align: 'center' }
    }
  ]
} as const satisfies BlockDefinition<keyof CallToActionProps & string>

export type CallToActionPreset =
  (typeof callToActionDefinition.presets)[number]['name']
