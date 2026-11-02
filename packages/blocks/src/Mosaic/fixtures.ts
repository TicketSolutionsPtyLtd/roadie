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
  width: 214,
  height: 48
})

export const partnerTiles = {
  title: 'Industry partnerships',
  description:
    "We back Australia's live events industry through partnerships that strengthen it.",
  tiles: [
    {
      title: 'Ochre Kite Weekender',
      description: 'Presenting partner',
      logo: logo('Ochre Kite Weekender'),
      image: photo('01'),
      size: 'lg'
    },
    {
      title: 'Velvet Dingo Fest',
      description: 'Sponsor',
      logo: logo('Velvet Dingo Fest'),
      image: photo('02')
    },
    {
      title: 'Thimble Orbit Presents',
      description: 'Category partner',
      logo: logo('Thimble Orbit Presents'),
      image: photo('03')
    }
  ],
  logoTile: {
    title: 'Also supporting',
    logos: [
      logo('Kerosene Pony Collective'),
      logo('Wishbone Ferret Collective')
    ]
  }
} satisfies MosaicProps
