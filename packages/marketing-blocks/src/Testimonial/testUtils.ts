import type { TestimonialProps } from '.'

export const quote = {
  title: 'Our partners say it best',
  description: 'Why venues and event organisers partner with Oztix',
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
      width: 120,
      height: 40
    }
  },
  backgroundImage: {
    src: '/brand/photography/05.webp',
    alt: '',
    width: 1600,
    height: 900
  }
} satisfies TestimonialProps
