/** A string with at least one character, as a saved key or value needs. */
export const isText = (value: unknown): value is string =>
  typeof value === 'string' && value !== ''
