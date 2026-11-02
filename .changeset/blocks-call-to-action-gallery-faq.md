---
'@oztix/roadie-blocks': minor
---

Add `CallToAction` (`@oztix/roadie-blocks/call-to-action`), `Gallery` (`@oztix/roadie-blocks/gallery`), and `FAQ` (`@oztix/roadie-blocks/faq`), blocks that close a page with its next step, show its people, events, and partners in photos or logos, and answer its questions in an accordion.

`CallToAction` has two presets: `photo` sets the pitch beside a 9:16 photo that breaks out of the panel, tilted unless `tilted` is `false`, with an `illustration` at its corner; `centred` centres the pitch and its buttons. Its `emphasis` adds `strong` and `inverted`, on which its copy and strong action stay readable. `Gallery` has `carousel`, images to step through, `marquee`, images scrolling past that hold still under reduced motion or a pause, and `logos`, a wrapping, centred row of logos at their own shape. Its `ratio` crops carousel and marquee tiles to `portrait`, `square`, or `landscape`, and an image with an `href` is a link. `FAQ` has `accordion`, with each of its `questions` answered in `Prose`, and `itemEmphasis` for its questions (`subtler`, `subtle`, or `normal`).
