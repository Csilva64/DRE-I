import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { BrandingProvider } from '@/components/providers/BrandingProvider'
import { SubscriptionProvider } from '@/components/providers/SubscriptionProvider'
import { fetchBrandingBySlug } from '@/lib/tenant/branding'
import { DEFAULT_BRANDING } from '@/lib/tenant'

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug') ?? 'opco'
  const branding = await fetchBrandingBySlug(tenantSlug)
  const title = `${branding.companyName} · DREINSIGHT`
  return {
    title,
    description: 'DREINSIGHT - Painel Financeiro',
    openGraph: { title, description: 'DREINSIGHT - Painel Financeiro', type: 'website' },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug') ?? 'opco'

  const branding = await fetchBrandingBySlug(tenantSlug)

  return (
    <html lang={branding.locale}>
      <head>
        {branding.faviconUrl && <link rel="icon" href={branding.faviconUrl} />}
        <style>{`:root{--color-primary:${branding.primaryColor};--color-accent:${branding.accentColor};}`}</style>
      </head>
      <body>
        <BrandingProvider branding={branding}>
          <AuthProvider>
            <SubscriptionProvider>
              {children}
            </SubscriptionProvider>
          </AuthProvider>
        </BrandingProvider>
      </body>
    </html>
  )
}
