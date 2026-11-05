---
'@oztix/roadie-editor': minor
---

Add `theme` to the email editor, and keep its canvas in the email's colours. The canvas used to follow the app's dark theme while the email it sends stays light. It now draws the background, text, links, buttons, and dividers in `theme`, the same `EmailTheme` that `renderEmail` takes, or in Roadie's light scales without one, so it looks the same in a light app and a dark one.
