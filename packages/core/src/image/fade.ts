const BLUR_IMAGE = '[data-slot=image-blur] img'

/**
 * A `<head>` script that fades in a server-rendered `Image placeholder='blur'`
 * as soon as its bytes arrive, before hydration. Without it, such an image shows
 * at once with no fade.
 * @example
 * <script nonce={nonce} dangerouslySetInnerHTML={{ __html: getImageFadeScript() }} />
 */
export function getImageFadeScript(): string {
  // `load` doesn't bubble, so the listener captures it. The document is marked
  // last, so a script that throws never leaves images hidden.
  return `try{var d=document,s='${BLUR_IMAGE}',m=function(i){i.setAttribute('data-loaded','')};d.addEventListener('load',function(e){var t=e.target;t.matches&&t.matches(s)&&m(t)},true);[].forEach.call(d.querySelectorAll(s),function(i){i.complete&&i.currentSrc&&m(i)});d.documentElement.setAttribute('data-image-fade','')}catch(x){}`
}
