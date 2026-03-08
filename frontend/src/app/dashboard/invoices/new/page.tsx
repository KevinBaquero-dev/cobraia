'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { clientsApi, invoicesApi } from '@/lib/api';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';

const inputClass = "w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-white placeholder-text-muted text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 transition-colors";
const labelClass = "block text-sm text-text-secondary mb-1.5";

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(amount);
}

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get('clientId');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clients, setClients] = useState<any[]>([]);

  const [form, setForm] = useState({
    clientId: preselectedClientId || '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    taxRate: 19,
    retentionRate: 0,
    discount: 0,
    notes: '',
    status: 'DRAFT',
  });

  const [items, setItems] = useState([
    { description: '', quantity: 1, unitPrice: 0 },
  ]);

  useEffect(() => {
    const load = async () => {
      const res: any = await clientsApi.list({ limit: 100 });
      setClients(res?.data?.data || []);
    };
    load();
  }, []);

  const updateItem = (index: number, field: string, value: any) => {
    setItems((prev) => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const addItem = () => setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const subtotal = items.reduce((s, item) => s + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * (form.taxRate / 100);
  const retentionAmount = subtotal * (form.retentionRate / 100);
  const total = subtotal + taxAmount - retentionAmount - form.discount;

  const handleSubmit = async (e: React.FormEvent, asDraft = false) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await invoicesApi.create({
        ...form,
        status: asDraft ? 'DRAFT' : 'SENT',
        taxRate: Number(form.taxRate),
        retentionRate: Number(form.retentionRate),
        discount: Number(form.discount),
        items: items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });
      router.push('/dashboard/invoices');
    } catch (err: any) {
      setError(err?.message || 'Error al crear la factura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/invoices">
          <button className="p-2 rounded-xl border border-border text-text-secondary hover:text-white hover:border-border-light transition-colors">
            <ArrowLeft size={16} />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-white">Nueva factura</h1>
          <p className="text-text-secondary text-sm mt-1">Crea una factura de cobro</p>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Cliente y fechas */}
        <div className="glass rounded-2xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">Información general</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3">
              <label className={labelClass}>Cliente *</label>
              <select
                value={form.clientId}
                onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))}
                required
                className={inputClass}
              >
                <option value="">Selecciona un cliente</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Fecha de emisión</label>
              <input
                type="date"
                value={form.issueDate}
                onChange={(e) => setForm((p) => ({ ...p, issueDate: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha de vencimiento</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>IVA (%)</label>
              <input
                type="number"
                value={form.taxRate}
                onChange={(e) => setForm((p) => ({ ...p, taxRate: Number(e.target.value) }))}
                min={0} max={100}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="glass rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Productos / Servicios</h2>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 text-xs text-brand-light hover:text-white transition-colors"
            >
              <Plus size={13} /> Agregar línea
            </button>
          </div>

          <div className="p-5 space-y-3">
            <div className="grid grid-cols-12 gap-3 text-xs text-text-muted font-medium uppercase tracking-wider px-1">
              <span className="col-span-6">Descripción</span>
              <span className="col-span-2 text-center">Cantidad</span>
              <span className="col-span-2 text-right">Precio unit.</span>
              <span className="col-span-1 text-right">Subtotal</span>
              <span className="col-span-1" />
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-6">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder="Descripción del producto o servicio"
                    required
                    className={inputClass}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                    min={1}
                    className={`${inputClass} text-center`}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                    min={0}
                    className={`${inputClass} text-right`}
                  />
                </div>
                <div className="col-span-1 text-right">
                  <span className="text-sm text-white">
                    {formatCOP(item.quantity * item.unitPrice)}
                  </span>
                </div>
                <div className="col-span-1 flex justify-end">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-border px-5 py-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Subtotal</span>
                  <span className="text-white">{formatCOP(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">IVA ({form.taxRate}%)</span>
                  <span className="text-white">{formatCOP(taxAmount)}</span>
                </div>
                {form.retentionRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Retención ({form.retentionRate}%)</span>
                    <span className="text-red-400">-{formatCOP(retentionAmount)}</span>
                  </div>
                )}
                {form.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Descuento</span>
                    <span className="text-red-400">-{formatCOP(form.discount)}</span>
                  </div>
                )}
                <div className="h-px bg-border" />
                <div className="flex justify-between text-base font-semibold">
                  <span className="text-white">Total</span>
                  <span className="text-brand-light">{formatCOP(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="glass rounded-2xl border border-border p-5">
          <label className={labelClass}>Notas adicionales</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Instrucciones de pago, condiciones, etc."
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link href="/dashboard/invoices" className="flex-none">
            <button type="button" className="px-6 py-2.5 rounded-xl border border-border text-text-secondary hover:text-white hover:border-border-light text-sm font-medium transition-colors">
              Cancelar
            </button>
          </Link>
          <button
            type="button"
            onClick={(e) => handleSubmit(e as any, true)}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl border border-border text-text-secondary hover:text-white hover:border-border-light text-sm font-medium transition-colors"
          >
            Guardar borrador
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-light disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? 'Creando...' : 'Crear y enviar factura'}
          </button>
        </div>
      </form>
    </div>
  );
}