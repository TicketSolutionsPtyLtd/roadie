import type { TestimonialProps } from '.'

export const quote = {
  title: 'Our partners say it best',
  description: 'Why venues and event organisers partner with Oztix',
  quotes: [
    {
      quote:
        'Oztix are attuned to what we need and quick to respond, and their marketing sells tickets, plain and simple.',
      person: {
        name: 'Mia Tran',
        role: 'Head of Programming',
        image: {
          src: '/brand/photography/04.webp',
          alt: 'Portrait of Mia Tran',
          width: 128,
          height: 128
        }
      },
      organisation: {
        name: 'Thimble Orbit Presents',
        logo: {
          src: '/blocks/thimble-orbit-presents-badge.svg',
          alt: 'Thimble Orbit Presents logo',
          width: 214,
          height: 48
        }
      }
    }
  ],
  image: {
    src: '/brand/photography/05.webp',
    alt: '',
    width: 1600,
    height: 900
  }
} satisfies TestimonialProps

export const carousel = {
  ...quote,
  preset: 'carousel',
  quotes: [
    quote.quotes[0]!,
    {
      quote:
        'Our crowd buys earlier now, and the support team answers before we finish asking.',
      person: { name: 'Sam Okafor', role: 'Venue Manager' },
      organisation: { name: 'Kazoo Hollow Room' }
    },
    {
      quote:
        'Settlement lands when they say it will, which is all a festival needs to plan next year.',
      person: { name: 'Priya Shah', role: 'Festival Director' },
      organisation: { name: 'Ochre Kite Weekender' }
    }
  ]
} satisfies TestimonialProps
