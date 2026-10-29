import type { HeroProps } from '.'
import type { BlockImage } from '../Provider'

type Photo = (alt: string) => BlockImage

/** A photo at a path of its own, for jsdom, which can't load `_test/browser`'s `photo()`. */
export const pathPhoto: Photo = (alt) => ({
  src: `/photos/${alt.toLowerCase().replaceAll(/\W+/g, '-')}.webp`,
  alt,
  width: 1200,
  height: 800
})

export const pageHero = (photo: Photo = pathPhoto): HeroProps => ({
  preset: 'page-hero',
  title: 'Australia’s ticketing partner',
  titleHighlight: 'Australia’s',
  description:
    'Australian owned and hosted, nationwide 7 days a week. Built on partnerships, powered by people and service.',
  actions: [
    { label: 'Talk to us', href: '/contact/sales' },
    { label: 'Create my event', href: 'https://studio.oztix.com.au' }
  ],
  backgroundImage: photo('A crowd at Velvet Dingo Fest'),
  video: {
    src: '/videos/showreel-av1.mp4',
    fallbackSrc: '/videos/showreel-h264.mp4',
    poster: photo('Highlights from Ochre Kite Weekender')
  },
  peopleImages: [
    photo('The Oztix team at Antler Kettle Hall'),
    photo('Event crew waving at Jumbuck Orchard Park')
  ],
  eventImages: [
    photo('A band on stage at Kazoo Hollow Room'),
    photo('The gates opening at Apricot Cyclone Fest')
  ]
})

export const pageHeader: HeroProps = {
  preset: 'page-header',
  eyebrow: 'Our mission',
  title:
    'We empower venues and event organisers to create thriving events and communities through genuine partnerships.'
}
