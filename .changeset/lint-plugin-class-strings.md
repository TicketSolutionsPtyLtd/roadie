---
'@oztix/roadie-lint-plugin': patch
---

Fix rules that missed two problems and read a condition as class text. `roadie/no-arbitrary-radius` now reports a raw length in a constant even when the constant was used elsewhere first, such as `cn(pad)` before `cn('rounded-(--r)', pad)`. The class string rules no longer read a condition as class text, so `cn(path === '/faq#top' && 'bg-strong')` passes `roadie/no-hex-colour-class`. `roadie/phosphor-icon-weight` now reports a wrong weight on a `Navigator.Item` icon, such as `weight='thin'`, while still letting the icon leave its weight out.
