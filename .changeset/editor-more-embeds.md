---
'@oztix/roadie-editor': minor
---

Add SoundCloud, Deezer and Apple Music to `defaultEmbedProviders`, so their share links and players embed in the rich preset, and `htmlToEditorValue` reads their iframes as embeds. A SoundCloud embed saves the track's permalink from a share link, or its numeric id from a player; an Apple Music embed saves its storefront and track as params.
