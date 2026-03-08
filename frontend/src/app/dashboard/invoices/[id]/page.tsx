'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { invoicesApi } from '@/lib/api';
import {
  ArrowLeft, Download, Copy, Loader2,
  CheckCircle, Clock, XCircle, Send,
} from 'lucide-react';
import { clsx } from 'clsx';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/20',
  SENT: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
  PAID: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
  OVERDUE: 'bg-red-500/20 text-red-400 border-red-500/20',
  CANCELLED: 'bg-zinc-600/20 text-zinc-500 border-zinc-600/20',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Borrador', SENT: 'Enviada',
  PAID: 'Pagada', OVERDUE: 'Vencida', CANCELLED: 'Cancelada',
};

const statusIcons: Record<string, any> = {
  DRAFT: Clock, SENT: Send, PAID: CheckCircle,
  OVERDUE: Clock, CANCELLED: XCircle,
};

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(amount);
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res: any = await invoicesApi.get(id as string);
        setInvoice(res?.data);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const res: any = await invoicesApi.generatePdf(id as string);
      const pdfUrl = res?.data?.pdfUrl;
      if (pdfUrl) window.open(pdfUrl, '_blank');
      const updated: any = await invoicesApi.get(id as string);
      setInvoice(updated?.data);
    } catch {}
    finally { setGeneratingPdf(false); }
  };

  const handleStatusChange = async (status: string) => {
    setUpdatingStatus(true);
    try {
      await invoicesApi.updateStatus(id as string, status);
      const updated: any = await invoicesApi.get(id as string);
      setInvoice(updated?.data);
    } catch {}
    finally { setUpdatingStatus(false); }
  };

  const handleDuplicate = async () => {
    try {
      await invoicesApi.duplicate(id as string);
      router.push('/dashboard/invoices');
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-brand-light" />
      </div>
    );
  }

  if (!invoice) return <div className="text-text-muted">Factura no encontrada</div>;

  const StatusIcon = statusIcons[invoice.status] || Clock;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/invoices">
            <button className="p-2 rounded-xl border border-border text-text-secondary hover:text-white hover:border-border-light transition-colors">
              <ArrowLeft size={16} />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-white">
                Factura #{invoice.invoiceNumber}
              </h1>
              <span className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', statusColors[invoice.status])}>
                <StatusIcon size={11} />
                {statusLabels[invoice.status]}
              </span>
            </div>
            <p className="text-text-muted text-sm mt-1">{invoice.client?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDuplicate}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-text-secondary hover:text-white text-sm transition-colors"
          >
            <Copy size={14} />
            Duplicar
          </button>
          <button
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-text-secondary hover:text-white text-sm transition-colors"
          >
            {generatingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {generatingPdf ? 'Generando...' : 'PDF'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Main content */}
        <div className="col-span-2 space-y-4">
          {/* Items */}
          <div className="glass rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-white">Productos / Servicios</h2>
            </div>
            <div className="divide-y divide-border">
              <div className="grid grid-cols-12 px-5 py-2.5 text-xs text-text-muted font-medium uppercase tracking-wider">
                <span className="col-span-6">Descripción</span>
                <span className="col-span-2 text-center">Cant.</span>
                <span className="col-span-2 text-right">Precio</span>
                <span className="col-span-2 text-right">Subtotal</span>
              </div>
              {invoice.items?.map((item: any) => (
                <div key={item.id} className="grid grid-cols-12 px-5 py-3.5 items-center">
                  <span className="col-span-6 text-sm text-text-secondary">{item.description}</span>
                  <span className="col-span-2 text-sm text-text-secondary text-center">{item.quantity}</span>
                  <span className="col-span-2 text-sm text-text-secondary text-right">{formatCOP(Number(item.unitPrice))}</span>
                  <span className="col-span-2 text-sm text-white font-medium text-right">
                    {formatCOP(Number(item.subtotal))}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border px-5 py-4">
              <div className="flex justify-end">
                <div className="w-56 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Subtotal</span>
                    <span className="text-white">{formatCOP(Number(invoice.subtotal))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">IVA ({invoice.taxRate}%)</span>
                    <span className="text-white">{formatCOP(Number(invoice.taxAmount))}</span>
                  </div>
                  {Number(invoice.retentionAmount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Retención</span>
                      <span className="text-red-400">-{formatCOP(Number(invoice.retentionAmount))}</span>
                    </div>
                  )}
                  {Number(invoice.discount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Descuento</span>
                      <span className="text-red-400">-{formatCOP(Number(invoice.discount))}</span>
                    </div>
                  )}
                  <div className="h-px bg-border" />
                  <div className="flex justify-between font-semibold">
                    <span className="text-white">Total</span>
                    <span className="text-brand-light text-lg">{formatCOP(Number(invoice.total))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="glass rounded-2xl border border-border p-5">
              <h2 className="text-sm font-semibold text-white mb-2">Notas</h2>
              <p className="text-sm text-text-secondary">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Info */}
          <div className="glass rounded-2xl border border-border p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">Detalles</h2>
            {[
              { label: 'Cliente', value: invoice.client?.name },
              { label: 'Emisión', value: new Date(invoice.issueDate).toLocaleDateString('es-CO') },
              { label: 'Vencimiento', value: new Date(invoice.dueDate).toLocaleDateString('es-CO') },
              { label: 'Moneda', value: invoice.currency },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-text-muted">{label}</span>
                <span className="text-text-secondary">{value}</span>
              </div>
            ))}
          </div>

          {/* Status actions */}
          <div className="glass rounded-2xl border border-border p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">Cambiar estado</h2>
            <div className="space-y-2">
              {invoice.status !== 'PAID' && (
                <button
                  onClick={() => handleStatusChange('PAID')}
                  disabled={updatingStatus}
                  className="w-full py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  {updatingStatus ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                  Marcar como pagada
                </button>
              )}
              {invoice.status === 'DRAFT' && (
                <button
                  onClick={() => handleStatusChange('SENT')}
                  disabled={updatingStatus}
                  className="w-full py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Send size={13} />
                  Marcar como enviada
                </button>
              )}
              {invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' && (
                <button
                  onClick={() => handleStatusChange('CANCELLED')}
                  disabled={updatingStatus}
                  className="w-full py-2 rounded-xl border border-border text-text-muted text-sm hover:text-red-400 hover:border-red-500/30 transition-colors"
                >
                  Cancelar factura
                </button>
              )}
            </div>
          </div>

          {/* PDF */}
          {invoice.pdfUrl && (
            <div className="glass rounded-2xl border border-border p-5">
              <h2 className="text-sm font-semibold text-white mb-3">PDF generado</h2>
              <a
                href={invoice.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-brand-light hover:text-white transition-colors"
              >
                <Download size={14} />
                Descargar PDF
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}