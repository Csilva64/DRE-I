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

const LOCAL_KEY = 'tenant_config_v1'

function loadLocal(): TenantConfig {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return DEFAULT
    return { ...DEFAULT, ...JSON.parse(raw) }
  } catch { return DEFAULT }
}

function saveLocal(cfg: TenantConfig) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(cfg)) } catch {}
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
  const [tenant, setTenant] = useState<TenantConfig>(loadLocal)
  const [loading, setLoading] = useState(false)

  // Load from Supabase when user logs in
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
          const cfg: TenantConfig = {
            id: data.id,
            companyName: data.company_name ?? DEFAULT.companyName,
            primaryColor: data.primary_color ?? DEFAULT.primaryColor,
            accentColor: data.accent_color ?? DEFAULT.accentColor,
            logoUrl: data.logo_url ?? '',
            customDomain: data.custom_domain ?? '',
          }
          setTenant(cfg)
          saveLocal(cfg)
        }
        setLoading(false)
      })
  }, [user])

  const saveTenant = async (cfg: TenantConfig, logoFile?: File | null) => {
    let logoUrl = cfg.logoUrl

    // Handle logo: Supabase Storage if available, else base64 locally
    if (logoFile) {
      if (supabase && user) {
        const ext = logoFile.name.split('.').pop()
        const path = `logos/${user.id}.${ext}`
        await supabase.storage.from('tenant-assets').upload(path, logoFile, { upsert: true })
        const { data } = supabase.storage.from('tenant-assets').getPublicUrl(path)
        logoUrl = data.publicUrl
      } else {
        // Fallback: store as base64 in localStorage
        logoUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.readAsDataURL(logoFile)
        })
      }
    }

    const updated = { ...cfg, logoUrl }

    // Persist to Supabase if available
    if (supabase && user) {
      const row = {
        owner_id: user.id,
        company_name: updated.companyName,
        primary_color: updated.primaryColor,
        accent_color: updated.accentColor,
        logo_url: logoUrl,
        custom_domain: updated.customDomain,
      }
      if (cfg.id) {
        await supabase.from('tenants').update(row).eq('id', cfg.id)
      } else {
        const { data } = await supabase.from('tenants').insert(row).select().single()
        updated.id = data?.id
      }
    }

    // Always persist locally
    saveLocal(updated)
    setTenant(updated)
  }

  return (
    <TenantContext.Provider value={{ tenant, loading, saveTenant }}>
      {children}
    </TenantContext.Provider>
  )
}

export const useTenant = () => useContext(TenantContext)
