import type { RichTextProps } from '.'

export const statement: RichTextProps = {
  preset: 'statement',
  title:
    'We’re Australian-owned, Australian-hosted, and operate 7 days a week nationwide.',
  titleHighlight: 'Australian-owned',
  body: (
    <>
      <p>
        As Australia’s largest independent ticketing company, our mission for
        20+ years remains the same.
      </p>
      <p>
        We proudly welcome new clients of every size, stage and ambition to
        become an Oztix partner.
      </p>
    </>
  )
}

export const longForm: RichTextProps = {
  preset: 'long-form',
  title: 'How refunds work',
  body: (
    <>
      <p>
        When Velvet Dingo Fest is cancelled, every ticket is refunded to the
        card it was bought with.
      </p>
      <h3>Booking fees</h3>
      <p>
        Fees come back too. <a href='/refunds'>Read the refund policy</a>.
      </p>
    </>
  )
}
