import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Data visualisation',
  description: 'Moved to Charts',
  category: 'Content',
  hidden: true
}

export default function DataVisualisationMoved() {
  redirect('/charts/data-visualisation')
}
