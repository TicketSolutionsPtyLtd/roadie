---
'@oztix/roadie-components': minor
---

Add `OTPField`, a one-time code input with one slot per character, built on
Base UI's OTP field primitive. `<OTPField length={6} />` renders every slot, and
`groupSize={3}` splits them 3-3 with a separator. Compose `OTPField.Input` and
`OTPField.Separator` for other layouts. Slots look like `Input` and are 48px at
the default size. Pasting a full code fills every slot, the first slot offers
`autoComplete='one-time-code'`, numeric codes bring up the number pad, and
`onValueComplete` fires once the last digit lands. It inherits `invalid`,
`required` and `disabled` from `Field`.
