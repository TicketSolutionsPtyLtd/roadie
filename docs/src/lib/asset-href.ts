/** A root-relative link to a file under `public/`, such as a logo pack, rather than a page route. */
export const isAssetHref = (href: string) => /\.[a-z0-9]+$/i.test(href)
