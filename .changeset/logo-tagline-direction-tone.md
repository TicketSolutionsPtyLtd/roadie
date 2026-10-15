---
'@oztix/roadie-components': minor
---

Logo takes every lockup through `variant`: `normal` (the default), `mark`,
`wordmark`, `tagline`, and `product`. `variant='tagline'` adds Built on
Partnerships after a divider, from the brand logo pack. `variant='product'`
needs `product`, and `product` on its own still implies it, so
`<Logo product='Studio' />` keeps working. The product logo's `data-variant`
is now `product`. A logo with the tagline is named "Oztix, Built on
Partnerships".

`direction='vertical'` sets the wordmark, and any tagline, under the mark, on
`normal` and `tagline` only. `tone` picks the colour on every lockup: `brand`
(the default, unchanged), `dark`, or `light`, each the same in light and dark
mode, or `neutral`, one colour that follows the theme. No tone takes a
surrounding intent's colour.

The props are a discriminated union, so passing `product` with another
variant, or `direction` with `mark`, `wordmark`, or `product`, is now a type
error. A wrapper that forwards `Omit<LogoProps, …>` loses the union, so its
spread no longer type-checks; use a distributive omit
(`T extends unknown ? Omit<T, K> : never`) instead. A runtime `product` still
wins over any variant. The `LogoDirection` and `LogoTone` types are exported,
and `LogoVariant` adds `tagline` and `product`.
