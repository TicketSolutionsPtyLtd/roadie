import { AppearanceSettings } from '@/components/AppearanceSettings'

export const metadata = {
  title: 'Appearance',
  description: 'Theme and accent colour for the documentation site.'
}

export default function AppearancePage() {
  return (
    <div className='grid gap-12'>
      <p className='text-lg text-subtle'>
        Theme and accent colour for the documentation site.
      </p>
      <AppearanceSettings />
    </div>
  )
}
