import { getAssetPath } from '@/utils/getAssetPath'

const linkClass =
  'font-medium text-strong underline-offset-4 hover:underline'

/** Points agents at the page's markdown twin, when it has one, and at `llms.txt`. */
export function MarkdownTwin({
  route,
  hasTwin
}: {
  route: string
  hasTwin: boolean
}) {
  const twin = getAssetPath(`${route}.md`)
  return (
    <>
      {/* React hoists this into the head. */}
      {hasTwin ? (
        <link rel='alternate' type='text/markdown' href={twin} />
      ) : null}
      <p
        data-slot='markdown-twin'
        className='mt-6 flex flex-wrap gap-x-2 text-sm text-subtle'
      >
        <span className='font-semibold'>For agents</span>
        {hasTwin ? (
          <>
            <a href={twin} className={linkClass}>
              This page as Markdown
            </a>
            <span aria-hidden className='text-subtler'>
              ·
            </span>
          </>
        ) : null}
        <a href={getAssetPath('/llms.txt')} className={linkClass}>
          llms.txt
        </a>
      </p>
    </>
  )
}
