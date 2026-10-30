---
'@oztix/roadie-lint-plugin': patch
---

Fix `roadie/phosphor-icon-suffix` missing icons that come from scope rather than an import, such as in a live code editor. A bare name listed in `settings.roadie.phosphorIcons`, such as `Heart`, now fails wherever the code uses it, as `<Heart />` or `icon={Heart}`, with a message to use `HeartIcon`.
