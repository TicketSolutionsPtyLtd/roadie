import { z } from 'zod'

export const VALUE_FORMATS = [
  'number',
  'compact',
  'percent',
  'currency',
  'compactCurrency',
  'points',
  'index'
] as const

export const valueFormat = z.enum(VALUE_FORMATS)
export const goodWhen = z.enum(['up', 'down', 'neither'])
