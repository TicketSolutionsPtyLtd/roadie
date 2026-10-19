'use client'

import { CodeIcon, FileTextIcon, GithubLogoIcon } from '@phosphor-icons/react'

import { REPO_URL } from '@/lib/repo'
import type { SourceLink } from '@/lib/source-links'

import { IconButton } from '@oztix/roadie-components/button'
import { Menu } from '@oztix/roadie-components/menu'

const ICON = <GithubLogoIcon weight='bold' className='size-5' />

/** The page header's GitHub button: a menu of the code and the docs page when a page has both, otherwise a link. */
export function SourceMenu({ page, code }: SourceLink) {
  if (!page || !code) {
    const only = page ?? code
    return only ? (
      <IconButton
        href={`${REPO_URL}/${only}`}
        aria-label='View source on GitHub'
        emphasis='normal'
      >
        {ICON}
      </IconButton>
    ) : null
  }
  return (
    <Menu>
      <Menu.Trigger
        render={
          <IconButton aria-label='View on GitHub' emphasis='normal'>
            {ICON}
          </IconButton>
        }
      />
      <Menu.Content align='end'>
        <Menu.Item
          href={`${REPO_URL}/${code}`}
          icon={<CodeIcon weight='bold' />}
        >
          Component code
        </Menu.Item>
        <Menu.Item
          href={`${REPO_URL}/${page}`}
          icon={<FileTextIcon weight='bold' />}
        >
          Docs page
        </Menu.Item>
      </Menu.Content>
    </Menu>
  )
}
