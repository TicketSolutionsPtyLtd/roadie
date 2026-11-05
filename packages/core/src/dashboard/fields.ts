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
export const valueFormatOptions = {
  decimals: z.number().int().min(0).max(4).optional(),
  trailingZeroDisplay: z.enum(['auto', 'stripIfInteger']).optional()
}
export const xFormat = z.enum([...VALUE_FORMATS, 'daysOut', 'eventTime'])
export const goodWhen = z.enum(['up', 'down', 'neither'])
