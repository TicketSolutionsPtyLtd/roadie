import { describe, expect, it } from 'vitest'

import { fieldsOf } from './shapes'

type Person = { name: string; role?: string }

describe('fieldsOf', () => {
  it('returns every field it is given', () => {
    expect(fieldsOf<Person>()(['name', 'role'])).toEqual(['name', 'role'])
  })

  it('rejects a list missing a field, or naming one the type lacks', () => {
    // @ts-expect-error `role` is missing.
    fieldsOf<Person>()(['name'])
    // @ts-expect-error `email` isn't a field of Person.
    fieldsOf<Person>()(['name', 'role', 'email'])
  })
})
