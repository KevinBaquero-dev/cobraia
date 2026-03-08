'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { tenantsApi } from '@/lib/api';
import { Save, Loader2, Building2, Palette, FileText, Bell } from 'lucide-react';

const inputClass = "w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-white placeholder-text-muted text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 transition-colors";
const labelClass = "block text-sm text-text-secondary mb-1.5";

export default function SettingsPage() {
  const { tenant, setTenant } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('company');

  const [form, setForm] = useState({
    companyName: '',
    companySlogan: '',
    taxId: '',
    phone: '',
    address: '',
    brandColor: '#0d9488',
    invoiceCurrency: 'COP',
    invoicePaymentDays: 30,
    invoiceNotes: '',
    whatsappNumber: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res: any = await tenantsApi.getMe();
        const t = res?.data;
        setForm({
          companyName: t.companyName || '',
          companySlogan: t.companySlogan || '',
          taxId: t.taxId || '',
          phone: t.phone || '',
          address: t.address || '',
          brandColor: t.brandColor || '#0d9488',
          invoiceCurrency: t.invoiceCurrency || 'COP',
          invoicePaymentDays: t.invoicePaymentDays || 30,
          invoiceNotes: t.invoiceNotes || '',
          whatsappNumber: t.whatsappNumber || '',
        });
      } catch {}
    };
    load();
  }, []);

  const update = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setLoading(true);
    try {
      const res: any = await tenantsApi.update(form);
      if (tenant) setTenant({ ...tenant, ...res?.data });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    finally { setLoading(false); }
  };

  const tabs = [
    { id: 'company', label: 'Empresa', icon: Building2 },
    { id: 'branding', label: 'Marca', icon: Palette },
    { id: 'invoices', label: 'Facturas', icon: FileText },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Configuración</h1>
          <p className="text-text-secondary text-sm mt-1">Personaliza tu cuenta y empresa</p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-light disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saved ? '¡Guardado!' : loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-surface-2 text-white'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="glass rounded-2xl border border-border p-6">
        {activeTab === 'company' && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white mb-4">Información de la empresa</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>Nombre de la empresa *</label>
                <input type="text" value={form.companyName} onChange={(e) => update('companyName', e.target.value)} placeholder="Mi Empresa S.A.S" className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Slogan</label>
                <input type="text" value={form.companySlogan} onChange={(e) => update('companySlogan', e.target.value)} placeholder="Tu slogan aquí" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>NIT / RUT</label>
                <input type="text" value={form.taxId} onChange={(e) => update('taxId', e.target.value)} placeholder="900111222-1" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Teléfono</label>
                <input type="text" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+57 300 123 4567" className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Dirección</label>
                <input type="text" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Calle 123 # 45-67, Bogotá" className={inputClass} />
              </div>
              {tenant?.plan === 'ENTERPRISE' && (
                <div className="col-span-2">
                  <label className={labelClass}>Número WhatsApp Business</label>
                  <input type="text" value={form.whatsappNumber} onChange={(e) => update('whatsappNumber', e.target.value)} placeholder="+57 300 123 4567" className={inputClass} />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white mb-4">Identidad visual</h2>
            <div>
              <label className={labelClass}>Color de marca</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.brandColor}
                  onChange={(e) => update('brandColor', e.target.value)}
                  className="w-12 h-12 rounded-xl border border-border cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={form.brandColor}
                  onChange={(e) => update('brandColor', e.target.value)}
                  placeholder="#0d9488"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-white text-sm focus:outline-none focus:border-brand/50 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Vista previa del color</label>
              <div className="h-16 rounded-xl border border-border flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${form.brandColor}33, ${form.brandColor}11)`, borderColor: `${form.brandColor}44` }}>
                <span className="text-sm font-medium" style={{ color: form.brandColor }}>
                  CobraIA — {form.companyName || 'Mi Empresa'}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white mb-4">Configuración de facturas</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Moneda</label>
                <select value={form.invoiceCurrency} onChange={(e) => update('invoiceCurrency', e.target.value)} className={inputClass}>
                  <option value="COP">COP — Peso colombiano</option>
                  <option value="USD">USD — Dólar americano</option>
                  <option value="EUR">EUR — Euro</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Días de pago por defecto</label>
                <input type="number" value={form.invoicePaymentDays} onChange={(e) => update('invoicePaymentDays', Number(e.target.value))} min={1} max={365} className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Nota por defecto en facturas</label>
                <textarea value={form.invoiceNotes} onChange={(e) => update('invoiceNotes', e.target.value)} placeholder="Ej: Gracias por su preferencia. Pago a 30 días." rows={3} className={`${inputClass} resize-none`} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white mb-4">Notificaciones</h2>
            <p className="text-text-muted text-sm">
              Las notificaciones por email estarán disponibles próximamente.
            </p>
            <div className="space-y-3">
              {[
                'Factura pagada',
                'Factura vencida',
                'Nuevo cliente registrado',
                'Resumen semanal',
              ].map((item) => (
                <div key={item} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <span className="text-sm text-text-secondary">{item}</span>
                  <div className="w-10 h-5 rounded-full bg-surface-3 border border-border flex items-center px-0.5 cursor-not-allowed opacity-50">
                    <div className="w-4 h-4 rounded-full bg-text-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}