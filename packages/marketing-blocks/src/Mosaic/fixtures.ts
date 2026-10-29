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

export const logoStrip = {
  preset: 'logo-strip',
  title: 'Trusted by organisers across Australia',
  tiles: [
    {
      name: 'Kerosene Pony Collective',
      logo: logo('Kerosene Pony Collective')
    },
    {
      name: 'Wishbone Ferret Collective',
      logo: logo('Wishbone Ferret Collective')
    },
    {
      name: 'Hairpin Bicycle Presents',
      logo: logo('Hairpin Bicycle Presents')
    },
    { name: 'Thimble Orbit Presents', logo: logo('Thimble Orbit Presents') },
    { name: 'Velcro Pelican Productions' }
  ]
} satisfies MosaicProps
