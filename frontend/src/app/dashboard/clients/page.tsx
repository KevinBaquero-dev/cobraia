'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clientsApi } from '@/lib/api';
import { Plus, Search, ChevronRight, Users, Phone, Mail, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [meta, setMeta] = useState<any>(null);

  const loadClients = async (q = '') => {
    setLoading(true);
    try {
      const res: any = await clientsApi.list({ search: q, limit: 20 });
      setClients(res?.data?.data || []);
      setMeta(res?.data?.meta || null);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadClients(); }, []);

  useEffect(() => {
    const timeout = setTimeout(() => loadClients(search), 400);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Clientes</h1>
          <p className="text-text-secondary text-sm mt-1">
            {meta ? `${meta.total} clientes registrados` : 'Gestiona tu cartera de clientes'}
          </p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-light text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Nuevo cliente
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, NIT o email..."
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border text-white placeholder-text-muted text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-border">
          <span className="col-span-4 text-xs font-medium text-text-muted uppercase tracking-wider">Cliente</span>
          <span className="col-span-3 text-xs font-medium text-text-muted uppercase tracking-wider">Contacto</span>
          <span className="col-span-2 text-xs font-medium text-text-muted uppercase tracking-wider">NIT</span>
          <span className="col-span-2 text-xs font-medium text-text-muted uppercase tracking-wider">Facturas</span>
          <span className="col-span-1" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-brand-light" />
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center">
              <Users size={20} className="text-text-muted" />
            </div>
            <p className="text-text-secondary text-sm">
              {search ? 'No se encontraron clientes' : 'No hay clientes aún'}
            </p>
            {!search && (
              <Link href="/dashboard/clients/new" className="text-brand-light text-sm hover:text-white transition-colors">
                Agregar el primero
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {clients.map((client: any) => (
              <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
                <div className="grid grid-cols-12 px-5 py-4 hover:bg-surface-2/50 transition-colors items-center">
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-surface-3 to-surface-2 border border-border flex items-center justify-center text-sm font-semibold text-white shrink-0">
                      {client.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{client.name}</p>
                      {client.city && (
                        <p className="text-xs text-text-muted">{client.city}</p>
                      )}
                    </div>
                  </div>
                  <div className="col-span-3 space-y-1">
                    {client.email && (
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Mail size={11} className="text-text-muted" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Phone size={11} className="text-text-muted" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-text-secondary">{client.taxId || '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-text-secondary">{client._count?.invoices || 0}</span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <ChevronRight size={15} className="text-text-muted" />
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