// Apart from EditingImages, as a 'use client' module's plain values reach a
// server only as client references.
export const PLACEHOLDER_SRC = 'roadie-blocks:placeholder'

/** A part waiting on its image while it's edited, which `EditingImages` draws. */
export const PLACEHOLDER_IMAGE = { src: PLACEHOLDER_SRC, alt: '' }
