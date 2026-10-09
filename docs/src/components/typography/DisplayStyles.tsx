import { getFamilyTokens } from '@/lib/tokens'

const CONTEXTS = [
  { context: 'ui', title: 'UI' },
  { context: 'prose', title: 'Prose' }
]

/** The numbered display styles, UI then prose, each set in its own style. */
export async function DisplayStyles() {
  const styles = (await getFamilyTokens('typography'))
    .filter(({ group }) => group === 'Display styles')
    .map(({ name }) => name)

  return (
    <div data-not-prose data-slot='display-styles' className='grid gap-6'>
      {CONTEXTS.map(({ context, title }) => (
        <section
          key={context}
          data-slot='display-context'
          className='grid emphasis-raised content-start gap-3 rounded-xl p-6'
        >
          <h3 className='text-display-ui-6 text-strong'>{title}</h3>
          <ol className='grid gap-3'>
            {styles
              .filter((name) => name.startsWith(`text-display-${context}-`))
              .map((name) => (
                <li key={name} data-slot='display-style' className='grid'>
                  {/* Core's safelist compiles every display style, so a class from data works. */}
                  <p
                    data-slot='display-sample'
                    className={`${name} text-strong`}
                  >
                    {name.replace('text-display-', '')}
                  </p>
                  <code className='font-mono text-xs text-subtle'>{name}</code>
                </li>
              ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
