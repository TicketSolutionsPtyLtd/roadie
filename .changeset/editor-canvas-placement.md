---
'@oztix/roadie-editor': patch
---

Fix where the canvas places its controls, and draw a filled email section as it sends.

- A Tint or Accent section is a band to the email's edges, its blocks 24px in and as far from its top and bottom as the sent email's.
- The columns toolbar keeps clear of the column grip, Section settings and badges below 1280px and on a phone, and the floating toolbar keeps clear of a section's settings.
- The grip and add button follow their block as a drawer opens or closes, without waiting for the pointer to move.
- A section's name sits above its box on an opaque fill, and shows only where the pointer can hover.
- Stacked columns on a phone say Move up and Move down, and each columns toolbar menu is headed with what it sets, such as Stack on phone.
