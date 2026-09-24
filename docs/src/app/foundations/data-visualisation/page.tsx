import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Data visualisation',
  description: 'Moved to Charts',
  category: 'Content'
}

export default function DataVisualisationMoved() {
  redirect('/charts/data-visualisation')
}
