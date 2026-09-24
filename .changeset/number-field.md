---
'@oztix/roadie-components': minor
---

Add `NumberField`, a number input with decrement and increment buttons, built on
Base UI's number field primitive. `<NumberField min={0} max={10} />` renders the
whole stepper; compose `NumberField.Group`, `Input`, `Decrement`, `Increment`
and `ScrubArea` when you need a different layout. The buttons turn off at `min`
and `max`. `format` takes `Intl.NumberFormat` options for currency, percentages
and units. It inherits `invalid`, `required` and `disabled` from `Field`.

- `size` and `emphasis` work like `Input`. `emphasis='subtler'` drops the field
  box for round buttons, sized like `IconButton`, either side of the value.
- `Decrement` and `Increment` take `emphasis` and `intent`, so
  `<NumberField.Increment emphasis='strong' intent='accent' />` gives an accent
  add button.
- `removable` turns the decrease button into a Remove button with a trash icon
  one step above `min`.
- `editable={false}` stops typing while the buttons and arrow keys still step,
  unlike `readOnly`, which stops every change.
- The field is only as wide as its widest value, from `min`, `max` and
  `format`. A typeable value keeps a tap target of at least 2.75rem, 3.5rem on
  touch screens, and at `subtler` sits in a chip that behaves like a subtle
  `Input`. Pass `className='w-full'` to stretch the field.
- The value animates with NumberFlow at every emphasis, using the same `format`
  and `locale`, and stays still for people who prefer reduced motion.
