---
'@oztix/roadie-core': patch
---

`text-subtle` now meets APCA Lc 75 for body text in light mode on the brand,
brand-secondary, accent (at the default accent hue), success, warning and info
intents, and in dark mode on warning. Step 11 of those scales is darker in light
mode (brand and accent oklch L 0.547 to 0.431, brand-secondary 0.569 to 0.463,
success 0.508 to 0.44, warning 0.576 to 0.465, info 0.505 to 0.457) and lighter
for dark warning (0.864 to 0.882), so subtle text reads at Lc 75 or more on the
neutral surfaces and on the intent's own, including its subtle fill. It stays a
step quieter than `text-normal` (step 12).

Everything else on those steps moves with it: `--intent-11`, the light strong
fill's hover on brand, accent and info, and the light chart status colours for
good, warning and serious. Danger, and the other intents in dark mode, are
unchanged.
