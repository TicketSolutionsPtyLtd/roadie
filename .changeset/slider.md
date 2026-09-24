---
'@oztix/roadie-components': minor
---

Add `Slider`, for picking a number or a range by dragging, built on Base UI's
slider primitive. `<Slider label='Price' defaultValue={[20, 80]} />` renders
the label, the value, the track and one thumb per value. `format` takes
`Intl.NumberFormat` options, such as AUD currency, and formats in `en-AU`
unless you pass a `locale`. Inside `Field` it takes its name, helper or error
text, and `invalid` and `disabled` from there. The fill is accent, like
`Switch` and `Checkbox`, and turns danger when invalid. Each thumb has a 44px
touch target. The parts (`Label`, `Value`, `Control`, `Track`, `Indicator`,
`Thumb`) compose for custom layouts such as tick marks.
