import {
  ArrowUpRight,
  CowboyHat,
  Cursor,
  FlowerSpiral,
  Football,
  Hand,
  Heart,
  HighFive,
  MapPin,
  NoteMusic,
  Ticket,
  WineGlass
} from '@oztix/roadie-components/spot-illustrations'

/** Every spot illustration a block can show, by its export name. */
export const SPOT_ILLUSTRATIONS = {
  ArrowUpRight,
  CowboyHat,
  Cursor,
  FlowerSpiral,
  Football,
  Hand,
  Heart,
  HighFive,
  MapPin,
  NoteMusic,
  Ticket,
  WineGlass
}

/** A spot illustration's name, such as `Ticket` or `MapPin`, as a CMS stores it. */
export type SpotIllustrationName = keyof typeof SPOT_ILLUSTRATIONS
