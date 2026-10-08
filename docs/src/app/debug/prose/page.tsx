import { Prose } from '@oztix/roadie-components/prose'

const ARTWORK =
  'https://assets.oztix.com.au/image/1226ab55-3d53-47f0-ab4c-cddcf02bb001.png'

function KitchenSink() {
  return (
    <>
      <h1>Ochre Kite Weekender 2026</h1>
      <p>
        Gates open at <strong>11am</strong> on Saturday at Jumbuck Orchard Park.
        Bring a printed or <a href='#tickets'>mobile ticket</a>, and press{' '}
        <kbd>Ctrl</kbd> + <kbd>P</kbd> to print yours. Set{' '}
        <code>data-ticket</code> on the scanner link to open the right wallet,
        and read the <em>conditions of entry</em> before you travel.
      </p>
      <h2>What to bring</h2>
      <p>Pack light. Lockers sell out by midday.</p>
      <ul>
        <li>
          Photo ID for the bar
          <ul>
            <li>A licence or passport</li>
            <li>A proof of age card</li>
          </ul>
        </li>
        <li>Sunscreen and a refillable bottle</li>
        <li>A clear bag no bigger than A4</li>
      </ul>
      <h3>Getting there</h3>
      <ol>
        <li>Catch the festival shuttle from the city.</li>
        <li>Walk the marked path from the drop-off.</li>
        <li>Show your ticket at the north gate.</li>
      </ol>
      <h4>Accessibility</h4>
      <dl>
        <dt>Viewing platform</dt>
        <dd>Beside the main stage, with a companion seat.</dd>
        <dt>Quiet room</dt>
        <dd>Open from noon behind the info tent.</dd>
      </dl>
      <h5>Set times</h5>
      <div className='prose-scroll'>
        <table>
          <thead>
            <tr>
              <th>Session</th>
              <th>Stage</th>
              <th>Doors</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Feathered Anchor Sessions</td>
              <td>Main</td>
              <td>7:30pm</td>
              <td>$49.00</td>
            </tr>
            <tr>
              <td>Lampshade Disco</td>
              <td>Tent</td>
              <td>10:00pm</td>
              <td>$25.00</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h6>Re-entry</h6>
      <blockquote>
        <p>Re-entry closes at 9pm. Keep your wristband on all weekend.</p>
      </blockquote>
      <pre>
        <code>{`curl https://example.com/tickets/ochre-kite`}</code>
      </pre>
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element -- CMS HTML arrives as a bare img */}
        <img src={ARTWORK} alt='Show artwork' width={360} />
        <figcaption>The 2026 poster.</figcaption>
      </figure>
      <hr />
      <p>
        Questions go to the festival help desk. Refunds follow the{' '}
        <a href='#refunds'>refund policy</a>.
      </p>
      <div className='not-prose grid emphasis-raised gap-1 rounded-xl p-4'>
        <p className='text-display-ui-6 text-strong'>
          An escaped card keeps its own styles
        </p>
        <ul>
          <li>No bullets or indent here</li>
        </ul>
      </div>
    </>
  )
}

export default function ProseKitchenSink() {
  return (
    <main className='grid grid-cols-1 gap-12 p-6'>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <section
          key={size}
          id={`size-${size}`}
          className='grid grid-cols-1 gap-4'
        >
          <p className='text-sm text-subtle'>size={size}</p>
          <Prose size={size}>
            <KitchenSink />
          </Prose>
        </section>
      ))}
    </main>
  )
}
