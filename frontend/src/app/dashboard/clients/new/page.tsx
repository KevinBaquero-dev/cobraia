'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clientsApi } from '@/lib/api';
import { ArrowLeft, Loader2 } from 'lucide-react';

const inputClass = "w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-white placeholder-text-muted text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 transition-colors";
const labelClass = "block text-sm text-text-secondary mb-1.5";

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', phone: '', taxId: '',
    address: '', city: '', notes: '',
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await clientsApi.create(form);
      router.push('/dashboard/clients');
    } catch (err: any) {
      setError(err?.message || 'Error al crear el cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/clients">
          <button className="p-2 rounded-xl border border-border text-text-secondary hover:text-white hover:border-border-light transition-colors">
            <ArrowLeft size={16} />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-white">Nuevo cliente</h1>
          <p className="text-text-secondary text-sm mt-1">Agrega un cliente a tu cartera</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="glass rounded-2xl border border-border p-6 space-y-5">
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Nombre o razón social *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Empresa ABC S.A.S"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Correo electrónico</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="contacto@empresa.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Teléfono / WhatsApp</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+57 300 123 4567"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>NIT / Cédula</label>
            <input
              type="text"
              value={form.taxId}
              onChange={(e) => update('taxId', e.target.value)}
              placeholder="900111222-1"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Ciudad</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              placeholder="Bogotá"
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Dirección</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="Calle 123 # 45-67"
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Notas internas</label>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Información adicional sobre el cliente..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/dashboard/clients" className="flex-1">
            <button
              type="button"
              className="w-full py-2.5 rounded-xl border border-border text-text-secondary hover:text-white hover:border-border-light text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-light disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? 'Guardando...' : 'Crear cliente'}
          </button>
        </div>
      </form>
    </div>
  );
}