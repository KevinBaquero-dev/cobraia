'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { clientsApi, invoicesApi } from '@/lib/api';
import {
  ArrowLeft, Edit2, Trash2, Mail, Phone, MapPin,
  FileText, ChevronRight, Loader2, Save, X,
} from 'lucide-react';
import { clsx } from 'clsx';

const inputClass = "w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-white placeholder-text-muted text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 transition-colors";

const statusColors: Record<string, string> = {
  DRAFT: 'bg-zinc-500/20 text-zinc-400',
  SENT: 'bg-blue-500/20 text-blue-400',
  PAID: 'bg-emerald-500/20 text-emerald-400',
  OVERDUE: 'bg-red-500/20 text-red-400',
  CANCELLED: 'bg-zinc-600/20 text-zinc-500',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Borrador', SENT: 'Enviada',
  PAID: 'Pagada', OVERDUE: 'Vencida', CANCELLED: 'Cancelada',
};

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(amount);
}

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    const load = async () => {
      try {
        const [clientRes, invRes]: any[] = await Promise.all([
          clientsApi.get(id as string),
          clientsApi.list({ limit: 50 }),
        ]);
        const c = clientRes?.data;
        setClient(c);
        setForm({
          name: c.name, email: c.email || '', phone: c.phone || '',
          taxId: c.taxId || '', address: c.address || '',
          city: c.city || '', notes: c.notes || '',
        });
        // Filtrar facturas del cliente
        const allInv = invRes?.data?.data || [];
        setInvoices(allInv.filter((i: any) => i.clientId === id));
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res: any = await clientsApi.update(id as string, form);
      setClient(res?.data);
      setEditing(false);
    } catch {}
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este cliente?')) return;
    await clientsApi.delete(id as string);
    router.push('/dashboard/clients');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-brand-light" />
      </div>
    );
  }

  if (!client) return <div className="text-text-muted">Cliente no encontrado</div>;

  const totalBilled = invoices.reduce((s: number, i: any) => s + Number(i.total), 0);
  const totalPaid = invoices.filter((i: any) => i.status === 'PAID').reduce((s: number, i: any) => s + Number(i.total), 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/clients">
            <button className="p-2 rounded-xl border border-border text-text-secondary hover:text-white hover:border-border-light transition-colors">
              <ArrowLeft size={16} />
            </button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand/30 to-accent-blue/30 border border-brand/20 flex items-center justify-center text-lg font-bold text-white">
              {client.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">{client.name}</h1>
              {client.taxId && <p className="text-text-muted text-sm">NIT: {client.taxId}</p>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="p-2 rounded-xl border border-border text-text-secondary hover:text-white transition-colors">
                <X size={16} />
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand hover:bg-brand-light text-white text-sm font-medium transition-colors">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Guardar
              </button>
            </>
          ) : (
            <>
              <button onClick={handleDelete} className="p-2 rounded-xl border border-border text-text-secondary hover:text-red-400 hover:border-red-500/30 transition-colors">
                <Trash2 size={16} />
              </button>
              <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-text-secondary hover:text-white hover:border-border-light text-sm font-medium transition-colors">
                <Edit2 size={14} />
                Editar
              </button>
              <Link href={`/dashboard/invoices/new?clientId=${client.id}`}>
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand hover:bg-brand-light text-white text-sm font-medium transition-colors">
                  <FileText size={14} />
                  Nueva factura
                </button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Info card */}
        <div className="col-span-1 space-y-4">
          <div className="glass rounded-2xl border border-border p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Información</h2>
            {editing ? (
              <div className="space-y-3">
                {[
                  { field: 'name', label: 'Nombre', type: 'text' },
                  { field: 'email', label: 'Email', type: 'email' },
                  { field: 'phone', label: 'Teléfono', type: 'text' },
                  { field: 'taxId', label: 'NIT', type: 'text' },
                  { field: 'city', label: 'Ciudad', type: 'text' },
                  { field: 'address', label: 'Dirección', type: 'text' },
                ].map(({ field, label, type }) => (
                  <div key={field}>
                    <label className="block text-xs text-text-muted mb-1">{label}</label>
                    <input
                      type={type}
                      value={form[field]}
                      onChange={(e) => setForm((p: any) => ({ ...p, [field]: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {client.email && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Mail size={14} className="text-text-muted shrink-0" />
                    <span className="text-text-secondary truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Phone size={14} className="text-text-muted shrink-0" />
                    <span className="text-text-secondary">{client.phone}</span>
                  </div>
                )}
                {(client.city || client.address) && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <MapPin size={14} className="text-text-muted shrink-0" />
                    <span className="text-text-secondary">
                      {[client.address, client.city].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="glass rounded-2xl border border-border p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">Resumen financiero</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Total facturado</span>
                <span className="text-white font-medium">{formatCOP(totalBilled)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Total pagado</span>
                <span className="text-emerald-400 font-medium">{formatCOP(totalPaid)}</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Saldo pendiente</span>
                <span className={clsx('font-semibold', totalBilled - totalPaid > 0 ? 'text-red-400' : 'text-emerald-400')}>
                  {formatCOP(totalBilled - totalPaid)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices */}
        <div className="col-span-2 glass rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-white">
              Facturas ({invoices.length})
            </h2>
            <Link href={`/dashboard/invoices/new?clientId=${client.id}`} className="text-xs text-brand-light hover:text-white transition-colors">
              + Nueva
            </Link>
          </div>
          <div className="divide-y divide-border">
            {invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <FileText size={20} className="text-text-muted" />
                <p className="text-text-muted text-sm">Sin facturas</p>
              </div>
            ) : (
              invoices.map((inv: any) => (
                <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`}>
                  <div className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-2/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-white">#{inv.invoiceNumber}</p>
                      <p className="text-xs text-text-muted">
                        {new Date(inv.issueDate).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', statusColors[inv.status])}>
                        {statusLabels[inv.status]}
                      </span>
                      <span className="text-sm font-medium text-white w-28 text-right">
                        {formatCOP(Number(inv.total))}
                      </span>
                      <ChevronRight size={14} className="text-text-muted" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}