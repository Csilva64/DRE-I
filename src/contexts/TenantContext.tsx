import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export interface TenantConfig {
  id?: string
  companyName: string
  primaryColor: string
  accentColor: string
  logoUrl: string
  customDomain: string
}

const DEFAULT: TenantConfig = {
  companyName: 'DRE-Insight',
  primaryColor: '#f97316',
  accentColor: '#3b82f6',
  logoUrl: '',
  customDomain: '',
}

type TenantContextType = {
  tenant: TenantConfig
  loading: boolean
  saveTenant: (cfg: TenantConfig, logoFile?: File | null) => Promise<void>
}

const TenantContext = createContext<TenantContextType>({
  tenant: DEFAULT, loading: false, saveTenant: async () => {},
})

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [tenant, setTenant] = useState<TenantConfig>(DEFAULT)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user || !supabase) return
    setLoading(true)
    supabase
      .from('tenants')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTenant({
            id: data.id,
            companyName: data.company_name ?? DEFAULT.companyName,
            primaryColor: data.primary_color ?? DEFAULT.primaryColor,
            accentColor: data.accent_color ?? DEFAULT.accentColor,
            logoUrl: data.logo_url ?? '',
            customDomain: data.custom_domain ?? '',
          })
        }
        setLoading(false)
      })
  }, [user])

  const saveTenant = async (cfg: TenantConfig, logoFile?: File | null) => {
    if (!supabase || !user) return
    let logoUrl = cfg.logoUrl

    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const path = `logos/${user.id}.${ext}`
      await supabase.storage.from('tenant-assets').upload(path, logoFile, { upsert: true })
      const { data } = supabase.storage.from('tenant-assets').getPublicUrl(path)
      logoUrl = data.publicUrl
    }

    const row = {
      owner_id: user.id,
      company_name: cfg.companyName,
      primary_color: cfg.primaryColor,
      accent_color: cfg.accentColor,
      logo_url: logoUrl,
      custom_domain: cfg.customDomain,
    }

    if (cfg.id) {
      await supabase.from('tenants').update(row).eq('id', cfg.id)
    } else {
      const { data } = await supabase.from('tenants').insert(row).select().single()
      cfg = { ...cfg, id: data?.id, logoUrl }
    }

    setTenant({ ...cfg, logoUrl })
  }

  return (
    <TenantContext.Provider value={{ tenant, loading, saveTenant }}>
      {children}
    </TenantContext.Provider>
  )
}

export const useTenant = () => useContext(TenantContext)
