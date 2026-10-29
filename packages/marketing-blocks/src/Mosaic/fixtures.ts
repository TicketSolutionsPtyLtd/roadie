import type { MosaicProps } from '.'

const photo = (n: string) => ({
  src: `/brand/photography/${n}.webp`,
  alt: '',
  width: 800,
  height: 800
})

const logo = (name: string) => ({
  src: `/blocks/${name.toLowerCase().replaceAll(' ', '-')}.svg`,
  alt: `${name} logo`,
  width: 240,
  height: 80
})

export const partnerTiers = {
  title: 'Industry partnerships',
  description:
    "We back Australia's live events industry through partnerships that strengthen it.",
  tiles: [
    {
      name: 'Ochre Kite Weekender',
      label: 'Presenting partner',
      logo: logo('Ochre Kite Weekender'),
      image: photo('01'),
      featured: true
    },
    {
      name: 'Velvet Dingo Fest',
      label: 'Sponsor',
      logo: logo('Velvet Dingo Fest'),
      image: photo('02')
    },
    {
      name: 'Thimble Orbit Presents',
      label: 'Category partner',
      logo: logo('Thimble Orbit Presents'),
      image: photo('03')
    }
  ],
  logoTile: {
    logos: [
      logo('Kerosene Pony Collective'),
      logo('Wishbone Ferret Collective')
    ]
  }
} satisfies MosaicProps
