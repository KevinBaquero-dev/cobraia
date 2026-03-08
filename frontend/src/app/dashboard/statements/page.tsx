'use client';

import { useState, useEffect } from 'react';
import { clientsApi, statementsApi } from '@/lib/api';
import { FileText, Loader2, Download, Search } from 'lucide-react';

const inputClass = "w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-white placeholder-text-muted text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 transition-colors";
const labelClass = "block text-sm text-text-secondary mb-1.5";

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(amount);
}

export default function StatementsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [preview, setPreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res: any = await clientsApi.list({ limit: 100 });
      setClients(res?.data?.data || []);
    };
    load();
  }, []);

  const filteredClients = clients.filter((c: any) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const handlePreview = async () => {
    if (!selectedClient) return;
    setLoadingPreview(true);
    try {
      const res: any = await statementsApi.preview({
        clientId: selectedClient.id,
        dateFrom,
        dateTo,
      });
      setPreview(res?.data);
    } catch {}
    finally { setLoadingPreview(false); }
  };

  const handleGenerate = async () => {
    if (!selectedClient) return;
    setGeneratingPdf(true);
    try {
      const res: any = await statementsApi.generate({
        clientId: selectedClient.id,
        dateFrom,
        dateTo,
      });
      const pdfUrl = res?.data?.pdfUrl;
      if (pdfUrl) window.open(pdfUrl, '_blank');
    } catch {}
    finally { setGeneratingPdf(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-white">Estados de Cuenta</h1>
        <p className="text-text-secondary text-sm mt-1">
          Genera estados de cuenta por cliente y rango de fechas
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Config panel */}
        <div className="col-span-1 space-y-4">
          <div className="glass rounded-2xl border border-border p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Configuración</h2>

            {/* Client search */}
            <div>
              <label className={labelClass}>Cliente *</label>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-2 border border-border text-white placeholder-text-muted text-sm focus:outline-none focus:border-brand/50 transition-colors"
                />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                {filteredClients.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedClient(c); setClientSearch(c.name); setPreview(null); }}
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                      selectedClient?.id === c.id
                        ? 'bg-brand/10 text-brand-light'
                        : 'text-text-secondary hover:bg-surface-2 hover:text-white'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Fecha desde</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Fecha hasta</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
            </div>

            <button
              onClick={handlePreview}
              disabled={!selectedClient || loadingPreview}
              className="w-full py-2.5 rounded-xl bg-surface-2 border border-border text-text-secondary hover:text-white hover:border-border-light disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loadingPreview ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {loadingPreview ? 'Cargando...' : 'Vista previa'}
            </button>

            <button
              onClick={handleGenerate}
              disabled={!selectedClient || generatingPdf}
              className="w-full py-2.5 rounded-xl bg-brand hover:bg-brand-light disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {generatingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {generatingPdf ? 'Generando PDF...' : 'Generar PDF'}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="col-span-2">
          {!preview ? (
            <div className="glass rounded-2xl border border-border h-full flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center">
                <FileText size={24} className="text-text-muted" />
              </div>
              <p className="text-text-secondary text-sm">
                Selecciona un cliente y haz clic en "Vista previa"
              </p>
            </div>
          ) : (
            <div className="glass rounded-2xl border border-border overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 border-b border-border">
                <h2 className="text-base font-semibold text-white">
                  Estado de cuenta — {preview.client?.name}
                </h2>
                <p className="text-text-muted text-sm mt-1">
                  {new Date(dateFrom).toLocaleDateString('es-CO')} —{' '}
                  {new Date(dateTo).toLocaleDateString('es-CO')}
                </p>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4 p-5">
                {[
                  { label: 'Total facturado', value: formatCOP(preview.summary?.totalBilled || 0), color: 'text-white' },
                  { label: 'Total pagado', value: formatCOP(preview.summary?.totalPaid || 0), color: 'text-emerald-400' },
                  { label: 'Saldo pendiente', value: formatCOP(preview.summary?.balance || 0), color: preview.summary?.balance > 0 ? 'text-red-400' : 'text-emerald-400' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-surface-2 rounded-xl p-4 border border-border">
                    <p className="text-xs text-text-muted mb-1">{stat.label}</p>
                    <p className={`text-lg font-semibold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Invoices table */}
              {preview.invoices?.length > 0 && (
                <div className="px-5 pb-5">
                  <h3 className="text-sm font-medium text-white mb-3">Facturas</h3>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="grid grid-cols-4 px-4 py-2.5 bg-surface-2 text-xs text-text-muted font-medium uppercase tracking-wider">
                      <span>#</span>
                      <span>Fecha</span>
                      <span>Estado</span>
                      <span className="text-right">Total</span>
                    </div>
                    <div className="divide-y divide-border">
                      {preview.invoices.map((inv: any) => (
                        <div key={inv.id} className="grid grid-cols-4 px-4 py-3 text-sm items-center">
                          <span className="text-white">#{inv.invoiceNumber}</span>
                          <span className="text-text-secondary">
                            {new Date(inv.issueDate).toLocaleDateString('es-CO')}
                          </span>
                          <span className="text-text-secondary">{inv.status}</span>
                          <span className="text-white text-right">{formatCOP(Number(inv.total))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}