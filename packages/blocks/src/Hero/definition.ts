import type { HeroPartner, HeroProps, HeroVideoSource } from '.'
import { fieldsOf } from '../_shared/shapes'
import type { BlockDefinition } from '../catalogue'

const ACTIONS = { actions: { max: 2 } } as const

export const heroDefinition = {
  name: 'hero',
  title: 'Hero',
  description:
    "Use it first on every page. Its title is the page's main heading.",
  group: 'open',
  keywords: ['header', 'banner', 'title', 'intro'],
  presets: [
    {
      name: 'bento',
      title: 'Bento',
      description:
        'The page hero for landing pages: a title panel over a photo, beside a video and two panels of cycling photos.',
      fields: [
        'preset',
        'id',
        'title',
        'highlight',
        'description',
        'actions',
        'image',
        'video',
        'images',
        'illustration',
        'intent',
        'align',
        'size'
      ],
      // Two photos for each cycling panel.
      limits: { ...ACTIONS, images: { min: 4 } },
      defaults: { align: 'start' }
    },
    {
      name: 'image',
      title: 'Image',
      description: 'A title beside one photo, for industry and service pages.',
      fields: [
        'preset',
        'id',
        'eyebrow',
        'title',
        'highlight',
        'description',
        'actions',
        'image',
        'ratio',
        'intent',
        'align',
        'size'
      ],
      limits: ACTIONS,
      defaults: { align: 'start', ratio: 'banner' }
    },
    {
      name: 'title',
      title: 'Title',
      description:
        'An eyebrow and a large title, with no media, for a page that opens on its text, such as About or a policy.',
      fields: [
        'preset',
        'id',
        'eyebrow',
        'title',
        'highlight',
        'description',
        'actions',
        'intent',
        'align',
        'size'
      ],
      limits: ACTIONS,
      defaults: { align: 'start' }
    },
    {
      name: 'partner',
      title: 'Partner',
      description:
        "The Oztix and a partner's logos joined by a heart, beside the page title, for a partner page.",
      fields: [
        'preset',
        'id',
        'eyebrow',
        'title',
        'highlight',
        'description',
        'body',
        'actions',
        'partner',
        'intent',
        'align',
        'size'
      ],
      limits: ACTIONS,
      defaults: { align: 'start' }
    }
  ],
  shapes: {
    video: fieldsOf<HeroVideoSource>()(['src', 'fallbackSrc', 'poster']),
    partner: fieldsOf<HeroPartner>()(['name', 'logo'])
  }
} as const satisfies BlockDefinition<keyof HeroProps & string>

export type HeroPreset = (typeof heroDefinition.presets)[number]['name']
