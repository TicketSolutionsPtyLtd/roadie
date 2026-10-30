---
'@oztix/roadie-marketing-blocks': minor
---

Add `CTABand` (`@oztix/roadie-marketing-blocks/cta-band`), `Gallery` (`@oztix/roadie-marketing-blocks/gallery`), and `FAQ` (`@oztix/roadie-marketing-blocks/faq`), blocks that close a page with its next step, show its people, events, and partners in photos or logos, and answer its questions in an accordion.

`CTABand` has one preset, `band`: with an `image`, the pitch sits beside a photo that breaks out of the panel, tilted unless `tilted` is `false`, with an `illustration` at its corner; without one, it's centred. Its `emphasis` adds `strong` and `inverted`, on which its copy and strong action stay readable. `Gallery` has `carousel`, images to step through, `marquee`, images scrolling past that hold still under reduced motion, and `wrap`, a wrapping, centred row. Its `ratio` crops the tiles to `portrait`, `square`, or `landscape`, or keeps them `natural` at one height for logos, and an image with an `href` is a link. `FAQ` has `accordion`, with each answer set in `Prose`, and `itemEmphasis` for its questions (`subtler`, `subtle`, or `normal`).
