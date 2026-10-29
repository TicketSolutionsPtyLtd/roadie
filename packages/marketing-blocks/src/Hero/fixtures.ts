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

export const bento = (photo: Photo = pathPhoto): HeroProps => ({
  preset: 'bento',
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
  primaryImages: [
    photo('The Oztix team at Antler Kettle Hall'),
    photo('Event crew waving at Jumbuck Orchard Park')
  ],
  secondaryImages: [
    photo('A band on stage at Kazoo Hollow Room'),
    photo('The gates opening at Apricot Cyclone Fest')
  ]
})

export const imageHero = (photo: Photo = pathPhoto): HeroProps => ({
  preset: 'image',
  title: 'Sell more tickets with Spotify',
  titleHighlight: 'Spotify',
  description:
    'Your events show on artist profiles, so fans find them where they already listen.',
  actions: [{ label: 'Talk to us', href: '/contact/sales' }],
  image: photo('A crowd singing along at Xylophone Tide Festival')
})

export const titleOnly: HeroProps = {
  preset: 'title',
  eyebrow: 'Our mission',
  title:
    'We empower venues and event organisers to create thriving events and communities through genuine partnerships.'
}
