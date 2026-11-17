/**
 * Whether `key` is one of `record`'s own keys. Saved content is untrusted,
 * and a prototype key such as `constructor` reads a value off `Object`.
 */
export const isOwnKey = <Key extends string>(
  record: Readonly<Record<Key, unknown>>,
  key: unknown
): key is Key => typeof key === 'string' && Object.hasOwn(record, key)
