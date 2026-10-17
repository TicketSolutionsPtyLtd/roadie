'use client'

import {
  BookOpenTextIcon,
  CopyIcon,
  FileTextIcon,
  ListBulletsIcon,
  RobotIcon
} from '@phosphor-icons/react'

import { getAssetPath } from '@/utils/getAssetPath'

import { IconButton } from '@oztix/roadie-components/button'
import { Menu } from '@oztix/roadie-components/menu'
import { useToastManager } from '@oztix/roadie-components/toast'

async function copyMarkdown(url: string) {
  // Safari only allows a clipboard write inside the click, so the fetch goes in as a pending blob.
  const markdown = fetch(url).then((response) => {
    if (!response.ok) throw new Error(`${response.status} ${url}`)
    return response.blob()
  })
  await navigator.clipboard.write([
    new ClipboardItem({ 'text/plain': markdown })
  ])
}

/** The page header's menu for using the docs with AI: the page's markdown twin, `llms.txt`, and the guide. */
export function AgentMenu({
  route,
  hasTwin
}: {
  route: string
  hasTwin: boolean
}) {
  const toast = useToastManager()
  const twin = `${route}.md`

  const copy = () =>
    copyMarkdown(getAssetPath(twin)).then(
      () => toast.add({ title: 'Page copied as Markdown' }),
      () => toast.add({ title: 'Couldn’t copy the page', intent: 'danger' })
    )

  return (
    <>
      {/* React hoists this into the head. */}
      {hasTwin ? (
        <link rel='alternate' type='text/markdown' href={getAssetPath(twin)} />
      ) : null}
      <Menu>
        <Menu.Trigger
          render={
            <IconButton aria-label='Use with AI' emphasis='normal'>
              <RobotIcon weight='bold' className='size-5' />
            </IconButton>
          }
        />
        <Menu.Content align='end'>
          {hasTwin ? (
            <>
              <Menu.Item icon={<CopyIcon weight='bold' />} onClick={copy}>
                Copy page as Markdown
              </Menu.Item>
              <Menu.Item href={twin} icon={<FileTextIcon weight='bold' />}>
                View as Markdown
              </Menu.Item>
            </>
          ) : null}
          <Menu.Item href='/llms.txt' icon={<ListBulletsIcon weight='bold' />}>
            llms.txt
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item
            href='/overview/ai'
            icon={<BookOpenTextIcon weight='bold' />}
          >
            Building with AI
          </Menu.Item>
        </Menu.Content>
      </Menu>
    </>
  )
}
