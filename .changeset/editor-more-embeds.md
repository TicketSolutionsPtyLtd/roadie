---
'@oztix/roadie-editor': minor
---

Add SoundCloud, Deezer and Apple Music to `defaultEmbedProviders`, so their share links and players embed in the rich preset, and `htmlToEditorValue` reads their iframes as embeds. A SoundCloud embed saves the permalink of a track or playlist, or the API resource (`tracks:293`) an embed code's player names, and refuses private links; an Apple Music embed saves its storefront and track as params.
