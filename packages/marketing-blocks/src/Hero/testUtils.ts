import type { HeroProps } from '.'

export const photo = (n: string, alt: string) => ({
  src: `/brand/photography/${n}.webp`,
  alt,
  width: 1200,
  height: 800
})

export const pageHero: HeroProps = {
  preset: 'page-hero',
  title: 'Australia’s ticketing partner',
  titleHighlight: 'Australia’s',
  description:
    'Australian owned and hosted, nationwide 7 days a week. Built on partnerships, powered by people and service.',
  actions: [
    { label: 'Talk to us', href: '/contact/sales' },
    { label: 'Create my event', href: 'https://studio.oztix.com.au' }
  ],
  backgroundImage: photo('01', 'A crowd at Velvet Dingo Fest'),
  video: {
    src: '/videos/showreel-av1.mp4',
    fallbackSrc: '/videos/showreel-h264.mp4',
    poster: photo('02', 'Highlights from Ochre Kite Weekender')
  },
  peopleImages: [
    photo('03', 'The Oztix team at Antler Kettle Hall'),
    photo('04', 'Event crew waving at Jumbuck Orchard Park')
  ],
  eventImages: [
    photo('05', 'A band on stage at Kazoo Hollow Room'),
    photo('06', 'The gates opening at Apricot Cyclone Fest')
  ]
}

export const pageHeader: HeroProps = {
  preset: 'page-header',
  eyebrow: 'Our mission',
  title:
    'We empower venues and event organisers to create thriving events and communities through genuine partnerships.'
}
