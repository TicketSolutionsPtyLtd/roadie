import {
  ChartLineIcon,
  CompassIcon,
  CubeIcon,
  HouseIcon,
  type Icon,
  PaintBrushIcon,
  PaletteIcon,
  PencilLineIcon,
  RowsIcon,
  SparkleIcon,
  SquaresFourIcon
} from '@phosphor-icons/react'

/** Each Navigator destination's icon, by href, shared by the rail and the docs palette. */
export const DESTINATION_ICONS: Record<string, Icon> = {
  '/': HouseIcon,
  '/brand': SparkleIcon,
  '/foundations': CompassIcon,
  '/content': PencilLineIcon,
  '/tokens': PaletteIcon,
  '/components': CubeIcon,
  '/charts': ChartLineIcon,
  '/blocks': RowsIcon,
  '/roadie-widgets': SquaresFourIcon,
  '/appearance': PaintBrushIcon
}

export const destinationIcon = (href: string): Icon =>
  DESTINATION_ICONS[href] ?? HouseIcon
