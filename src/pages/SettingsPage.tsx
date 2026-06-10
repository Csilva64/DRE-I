import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Building2 } from 'lucide-react'
import { useTenant, type TenantConfig } from '../contexts/TenantContext'

export default function SettingsPage() {
  const { tenant, saveTenant } = useTenant()
  const navigate = useNavigate()
  const [form, setForm] = useState<TenantConfig>({ ...tenant })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState(tenant.logoUrl)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setLogoFile(f)
    setLogoPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await saveTenant(form, logoFile)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
          <p className="text-slate-500 text-sm mt-1">White-label da sua organização</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">

          {/* Company name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nome da Empresa</label>
            <input
              type="text" value={form.companyName}
              onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Minha Empresa"
            />
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Cor Principal</label>
              <div className="flex items-center gap-2">
                <input
                  type="color" value={form.primaryColor}
                  onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text" value={form.primaryColor}
                  onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Cor de Destaque</label>
              <div className="flex items-center gap-2">
                <input
                  type="color" value={form.accentColor}
                  onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text" value={form.accentColor}
                  onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))}
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Logo upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Logo</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center gap-4 p-4 border-2 border-dashed rounded-xl transition-colors hover:border-orange-400"
              style={{ borderColor: logoPreview ? form.primaryColor + '66' : undefined }}
            >
              {logoPreview
                ? <img src={logoPreview} alt="logo" className="w-12 h-12 object-contain rounded-lg" />
                : <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: form.primaryColor + '22' }}>
                    <Building2 className="w-6 h-6" style={{ color: form.primaryColor }} />
                  </div>
              }
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: form.primaryColor }}>
                  {logoPreview ? 'Trocar logo' : 'Adicionar logo'}
                </p>
                <p className="text-xs text-slate-400">PNG, JPG, SVG, WEBP ou GIF · máx. 2 MB</p>
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>

          {/* Custom domain */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Domínio Personalizado</label>
            <input
              type="text" value={form.customDomain}
              onChange={e => setForm(f => ({ ...f, customDomain: e.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="dashboard.minhaempresa.com"
            />
          </div>

          {/* Preview */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Preview</p>
            <div className="border border-dashed border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {logoPreview
                  ? <img src={logoPreview} alt="logo" className="w-7 h-7 object-contain rounded" />
                  : <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white" style={{ background: form.primaryColor }}>
                      {form.companyName.charAt(0)}
                    </div>
                }
                <span className="font-bold text-sm text-slate-900">{form.companyName || 'Minha Empresa'}</span>
              </div>
              <div className="px-4 py-1.5 rounded-full text-white text-xs font-semibold" style={{ background: form.primaryColor }}>
                Botão
              </div>
            </div>
          </div>

          {/* Save */}
          <button
            type="submit" disabled={saving}
            className="w-full py-3 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-60"
            style={{ background: form.primaryColor }}
          >
            {saving ? 'Salvando...' : saved ? '✓ Configurações salvas!' : 'Salvar Configurações'}
          </button>
        </form>

        <button
          onClick={() => navigate('/')}
          className="mt-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  )
}
