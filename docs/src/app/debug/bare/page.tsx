import { redirect } from 'next/navigation'

export default function BareIndex() {
  redirect('/debug/bare/evt')
}
