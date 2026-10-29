---
'@oztix/roadie-editor': minor
---

Add `renderEmail` (`@oztix/roadie-editor/email`), which renders a saved email as a whole HTML page that mail clients show as designed, and its plain-text part. An email is an `EmailContent`: `{ kind: 'design', value }`, an `EditorValue` that it reads into the email preset first, or `{ kind: 'html', html }`, a page kept as written, which it sends unchanged, merge tags and Outlook blocks included. A design takes an app's brand kit as `theme`, over `defaultEmailTheme`, Roadie's light scales as hex. Its columns stack on a phone and stay side by side in Outlook on Windows, and a link or button whose href a mail client can't open keeps its text and loses its link. It runs on the server only, with `mjml` in a Next.js app's `serverExternalPackages`.
