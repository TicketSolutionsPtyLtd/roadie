---
'@oztix/roadie-core': patch
---

Fix `cn()` keeping both classes when `z-alert` meets another z-index tier, such as `cn('z-modal', 'z-alert')`, so a consumer's `z-alert` couldn't override a component's tier.
