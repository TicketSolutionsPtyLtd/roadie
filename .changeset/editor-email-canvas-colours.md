---
'@oztix/roadie-editor': minor
---

Add `theme` to the email editor, and keep its canvas in the email's colours. The canvas used to follow the app's dark theme while the email it sends stays light. It now draws the background, text, links, buttons, and dividers in `theme`, the same `EmailTheme` that `renderEmail` takes, or in `defaultEmailTheme` without one, so it looks the same in a light app and a dark one. Selected text takes a colour mixed from the email's, text sits 24 pixels in from each side, so it wraps where it sends, and columns reach 12 pixels further out, as they do in the sent email.
