import type { BlockDefinition } from '../catalogue'
import type { GalleryImage, GalleryProps } from './index'

const PHOTO_FIELDS = [
  'preset',
  'id',
  'eyebrow',
  'title',
  'highlight',
  'description',
  'images',
  'ratio',
  'actions',
  'intent',
  'emphasis',
  'contained',
  'align',
  'size'
] as const

const ACTIONS = { actions: { max: 2 } } as const

export const galleryDefinition = {
  name: 'gallery',
  title: 'Gallery',
  description:
    'Use it to show events and people in photos, or partners’ logos.',
  group: 'prove',
  presets: [
    {
      name: 'carousel',
      title: 'Carousel',
      description:
        'Photos people step through with controls or a swipe, for a set worth browsing, such as the events partners run.',
      fields: PHOTO_FIELDS,
      itemFields: ['src', 'alt', 'href'],
      limits: ACTIONS,
      defaults: { align: 'center', ratio: 'story' }
    },
    {
      name: 'marquee',
      title: 'Marquee',
      description:
        'Photos scrolling past on their own, with a pause button, for a sense of how many events run with Oztix at a glance.',
      fields: PHOTO_FIELDS,
      itemFields: ['src', 'alt', 'href'],
      limits: ACTIONS,
      defaults: { align: 'center', ratio: 'story' }
    },
    {
      name: 'logos',
      title: 'Logos',
      description:
        'Logos at their own shape in a wrapping, centred row, such as partners or certifications.',
      fields: [
        'preset',
        'id',
        'eyebrow',
        'title',
        'highlight',
        'description',
        'images',
        'actions',
        'intent',
        'emphasis',
        'contained',
        'align',
        'size'
      ],
      itemFields: ['src', 'alt', 'href'],
      limits: ACTIONS,
      defaults: { align: 'center', ratio: 'natural' }
    }
  ]
} as const satisfies BlockDefinition<
  keyof GalleryProps & string,
  keyof GalleryImage & string
>

export type GalleryPreset = (typeof galleryDefinition.presets)[number]['name']
