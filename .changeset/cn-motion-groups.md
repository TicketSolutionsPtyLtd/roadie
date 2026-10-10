---
'@oztix/roadie-core': patch
---

`cn()` treats `ease-spring-lively` and every Roadie `animate-*` utility (`animate-fade-in`, `-scale-in`, `-pop-in`, `-shake`, `-nudge`, `-pop`, and `-pop-tap`) as one group each, so a later easing or animation class replaces an earlier one instead of both staying.
