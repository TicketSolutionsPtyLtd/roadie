---
'@oztix/roadie-editor': minor
---

Add `renderEmail` (`@oztix/roadie-editor/email`), which renders a saved value as an email: a whole HTML page that mail clients show as designed, and its plain-text part. It reads the value into the email preset first, and takes an app's brand kit as `theme`, over `defaultEmailTheme`, Roadie's light scales as hex. Columns stack on a phone and stay side by side in Outlook on Windows. A link or button whose href a mail client can't open keeps its text and loses its link. It runs on the server only, with `mjml` in a Next.js app's `serverExternalPackages`.
