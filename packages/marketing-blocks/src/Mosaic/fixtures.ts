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
    logos: [
      logo('Kerosene Pony Collective'),
      logo('Wishbone Ferret Collective')
    ]
  }
} satisfies MosaicProps

export const logoStrip = {
  preset: 'logo-strip',
  title: 'Trusted by organisers across Australia',
  tiles: [
    {
      title: 'Kerosene Pony Collective',
      logo: logo('Kerosene Pony Collective')
    },
    {
      title: 'Wishbone Ferret Collective',
      logo: logo('Wishbone Ferret Collective')
    },
    {
      title: 'Hairpin Bicycle Presents',
      logo: logo('Hairpin Bicycle Presents')
    },
    { title: 'Thimble Orbit Presents', logo: logo('Thimble Orbit Presents') },
    { title: 'Velcro Pelican Productions' }
  ]
} satisfies MosaicProps
