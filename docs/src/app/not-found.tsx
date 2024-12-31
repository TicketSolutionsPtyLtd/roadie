import Link from 'next/link'

import { Text } from '@oztix/roadie-components'
import { css } from '@oztix/roadie-core/css'

export default function NotFound() {
  return (
    <main
      className={css({
        maxW: '1200px',
        mx: 'auto',
        p: '400',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minH: 'calc(100vh - 200px)'
      })}
    >
      <h1
        className={css({
          fontSize: '8xl',
          fontWeight: 'bold',
          mb: '200',
          color: 'fg.subtle'
        })}
      >
        404
      </h1>
      <Text
        fontSize='3xl'
        className={css({
          mb: '400',
          fontWeight: 'semibold'
        })}
      >
        Page Not Found
      </Text>
      <Text
        fontSize='xl'
        className={css({
          color: 'fg.subtle',
          mb: '600'
        })}
      >
        The page you're looking for doesn't exist or has been moved.
      </Text>
      <Link
        href='/'
        className={css({
          display: 'inline-block',
          px: '400',
          py: '200',
          bg: 'bg.accent',
          color: 'fg.onAccent',
          borderRadius: '100',
          fontWeight: 'medium',
          transition: 'all 0.2s',
          _hover: {
            bg: 'bg.accent.hovered'
          }
        })}
      >
        Return Home
      </Link>
    </main>
  )
}
