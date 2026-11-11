---
'roadie-skills': minor
---

`/roadie:migrate` has a `spot-illustrations` codemod, which moves imports from the deprecated `@oztix/roadie-components/spot-illustrations` to `@oztix/roadie-illustrations/spot` and reports what it can't move. `/roadie:setup`, `/roadie:build`, and `/roadie:audit` add `@oztix/roadie-illustrations` and its CSS, and `/roadie:build` gives a medium `EmptyState` a spot illustration.
