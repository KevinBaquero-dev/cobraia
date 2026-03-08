'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { invoicesApi } from '@/lib/api';
import { Plus, Search, FileText, ChevronRight, Loader2, Filter } from 'lucide-react';
import { clsx } from 'clsx';

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

const statusFilters = ['TODOS', 'DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [meta, setMeta] = useState<any>(null);

  const loadInvoices = async (q = '', status = 'TODOS') => {
    setLoading(true);
    try {
      const params: any = { limit: 20 };
      if (q) params.search = q;
      if (status !== 'TODOS') params.status = status;
      const res: any = await invoicesApi.list(params);
      setInvoices(res?.data?.data || []);
      setMeta(res?.data?.meta || null);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadInvoices(); }, []);

  useEffect(() => {
    const timeout = setTimeout(() => loadInvoices(search, statusFilter), 400);
    return () => clearTimeout(timeout);
  }, [search, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Facturas</h1>
          <p className="text-text-secondary text-sm mt-1">
            {meta ? `${meta.total} facturas en total` : 'Gestiona tus facturas de cobro'}
          </p>
        </div>
        <Link
          href="/dashboard/invoices/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-light text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Nueva factura
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número o cliente..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border text-white placeholder-text-muted text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-2 py-1.5">
          <Filter size={14} className="text-text-muted" />
          {statusFilters.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                statusFilter === s
                  ? 'bg-surface-2 text-white'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              {s === 'TODOS' ? 'Todos' : statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-border">
          <span className="col-span-2 text-xs font-medium text-text-muted uppercase tracking-wider"># Factura</span>
          <span className="col-span-3 text-xs font-medium text-text-muted uppercase tracking-wider">Cliente</span>
          <span className="col-span-2 text-xs font-medium text-text-muted uppercase tracking-wider">Fecha</span>
          <span className="col-span-2 text-xs font-medium text-text-muted uppercase tracking-wider">Vencimiento</span>
          <span className="col-span-1 text-xs font-medium text-text-muted uppercase tracking-wider">Estado</span>
          <span className="col-span-2 text-xs font-medium text-text-muted uppercase tracking-wider text-right">Total</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-brand-light" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center">
              <FileText size={20} className="text-text-muted" />
            </div>
            <p className="text-text-secondary text-sm">
              {search || statusFilter !== 'TODOS' ? 'No se encontraron facturas' : 'No hay facturas aún'}
            </p>
            {!search && statusFilter === 'TODOS' && (
              <Link href="/dashboard/invoices/new" className="text-brand-light text-sm hover:text-white transition-colors">
                Crear la primera factura
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {invoices.map((inv: any) => (
              <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`}>
                <div className="grid grid-cols-12 px-5 py-4 hover:bg-surface-2/50 transition-colors items-center">
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-white">#{inv.invoiceNumber}</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-sm text-text-secondary truncate">{inv.client?.name}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-text-secondary">
                      {new Date(inv.issueDate).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className={clsx(
                      'text-sm',
                      inv.status === 'OVERDUE' ? 'text-red-400' : 'text-text-secondary'
                    )}>
                      {new Date(inv.dueDate).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <div className="col-span-1">
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', statusColors[inv.status])}>
                      {statusLabels[inv.status]}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <span className="text-sm font-medium text-white">
                      {formatCOP(Number(inv.total))}
                    </span>
                    <ChevronRight size={14} className="text-text-muted" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}