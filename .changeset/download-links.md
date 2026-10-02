---
'@oztix/roadie-components': patch
---

A link with `download`, such as `<Button href='/files/lineup.pdf' download>`,
now renders a plain `<a>` instead of the provider's Link. A file isn't a route,
and Next.js prefetched it as one and logged a 404. Because the router no longer
handles it, add any base path to a download `href` yourself.
