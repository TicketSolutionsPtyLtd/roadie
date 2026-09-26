---
'@oztix/roadie-components': minor
---

Add `Slider`, for picking a number or a range by dragging. `<Slider
label='Price' defaultValue={[20, 80]} />` renders the label, the value, the
track and one thumb per value. `format` takes `Intl.NumberFormat` options,
such as AUD currency, and formats in `en-AU` unless you pass a `locale`.
Inside `Field` it takes its name, helper or error text, and `invalid` and
`disabled` from there. The fill is accent, like `Switch` and `Checkbox`, and
turns danger when invalid. `size` (`sm`, `md`, `lg`) scales the thumb and
track, each keeping a 44px touch target, and `direction='vertical'` runs it up
the page. The parts (`Label`, `Value`, `Control`, `Track`, `Indicator`,
`Thumb`) compose for custom layouts such as tick marks.
