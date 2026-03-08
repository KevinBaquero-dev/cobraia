'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { invoicesApi, clientsApi, subscriptionsApi } from '@/lib/api';
import {
  FileText, Users, TrendingUp, Clock,
  ArrowUpRight, ArrowDownRight, Plus, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

const statusColors: Record<string, string> = {
  DRAFT:     'bg-zinc-500/20 text-zinc-400',
  SENT:      'bg-blue-500/20 text-blue-400',
  PAID:      'bg-emerald-500/20 text-emerald-400',
  OVERDUE:   'bg-red-500/20 text-red-400',
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

export default function DashboardPage() {
  const { user, tenant } = useAuthStore();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [invRes, subRes]: any[] = await Promise.all([
          invoicesApi.list({ limit: 5 }),
          subscriptionsApi.getCurrent(),
        ]);
        setInvoices(invRes?.data?.data || []);
        setSubscription(subRes?.data || null);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const totalBilled = invoices.reduce((s: number, i: any) => s + Number(i.total), 0);
  const totalPaid = invoices.filter((i: any) => i.status === 'PAID').reduce((s: number, i: any) => s + Number(i.total), 0);
  const overdue = invoices.filter((i: any) => i.status === 'OVERDUE').length;

  const stats = [
    {
      label: 'Facturado (mes)',
      value: formatCOP(totalBilled),
      icon: TrendingUp,
      color: 'text-brand-light',
      bg: 'bg-brand/10',
      trend: '+12%',
      up: true,
    },
    {
      label: 'Cobrado',
      value: formatCOP(totalPaid),
      icon: FileText,
      color: 'text-accent-blue',
      bg: 'bg-accent-blue/10',
      trend: '+8%',
      up: true,
    },
    {
      label: 'Facturas activas',
      value: invoices.length.toString(),
      icon: FileText,
      color: 'text-accent-purple',
      bg: 'bg-accent-purple/10',
      trend: null,
      up: true,
    },
    {
      label: 'Vencidas',
      value: overdue.toString(),
      icon: Clock,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      trend: overdue > 0 ? 'Atención' : 'Al día',
      up: overdue === 0,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Hola, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {new Date().toLocaleDateString('es-CO', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-4 border border-border hover:border-border-light transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className={clsx('p-2 rounded-xl', stat.bg)}>
                <stat.icon size={16} className={stat.color} />
              </div>
              {stat.trend && (
                <span className={clsx(
                  'flex items-center gap-1 text-xs font-medium',
                  stat.up ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {stat.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {stat.trend}
                </span>
              )}
            </div>
            <p className="text-xl font-semibold text-white">{loading ? '—' : stat.value}</p>
            <p className="text-xs text-text-muted mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent invoices */}
        <div className="lg:col-span-2 glass rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-white">Facturas recientes</h2>
            <Link href="/dashboard/invoices" className="flex items-center gap-1 text-xs text-brand-light hover:text-white transition-colors">
              Ver todas <ChevronRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-3.5 w-24 bg-surface-3 rounded" />
                      <div className="h-3 w-32 bg-surface-2 rounded" />
                    </div>
                    <div className="h-3.5 w-20 bg-surface-3 rounded" />
                  </div>
                </div>
              ))
            ) : invoices.length === 0 ? (
              <div className="px-5 py-8 text-center text-text-muted text-sm">
                No hay facturas aún.{' '}
                <Link href="/dashboard/invoices/new" className="text-brand-light hover:text-white">
                  Crea la primera
                </Link>
              </div>
            ) : (
              invoices.map((inv: any) => (
                <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`}>
                  <div className="px-5 py-3.5 hover:bg-surface-2/50 transition-colors flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">#{inv.invoiceNumber}</p>
                      <p className="text-xs text-text-muted mt-0.5">{inv.client?.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', statusColors[inv.status])}>
                        {statusLabels[inv.status]}
                      </span>
                      <span className="text-sm font-medium text-white">
                        {formatCOP(Number(inv.total))}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Plan card */}
        <div className="space-y-4">
          <div className="glass rounded-2xl border border-border p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Tu plan</h2>
            {subscription ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-accent-blue flex items-center justify-center">
                    <TrendingUp size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{subscription.plan}</p>
                    <p className="text-xs text-text-muted">{formatCOP(subscription.price)}/mes</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Facturas este mes</span>
                    <span className="text-white">
                      {subscription.usage?.invoicesThisMonth}/
                      {subscription.limits?.invoicesPerMonth === -1 ? '∞' : subscription.limits?.invoicesPerMonth}
                    </span>
                  </div>
                  {subscription.limits?.invoicesPerMonth > 0 && (
                    <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand to-accent-blue rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (subscription.usage?.invoicesThisMonth / subscription.limits?.invoicesPerMonth) * 100)}%`
                        }}
                      />
                    </div>
                  )}
                </div>
                {subscription.plan === 'BASIC' && (
                  <Link
                    href="/dashboard/subscriptions"
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-brand/30 text-brand-light text-xs font-medium hover:bg-brand/10 transition-colors"
                  >
                    Mejorar plan
                  </Link>
                )}
              </>
            ) : (
              <div className="text-text-muted text-sm">Cargando...</div>
            )}
          </div>

          {/* Quick actions */}
          <div className="glass rounded-2xl border border-border p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Acciones rápidas</h2>
            <div className="space-y-2">
              {[
                { label: 'Nueva factura', href: '/dashboard/invoices/new', icon: Plus },
                { label: 'Agregar cliente', href: '/dashboard/clients/new', icon: Users },
                { label: 'Estado de cuenta', href: '/dashboard/statements', icon: FileText },
              ].map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-2 transition-colors cursor-pointer">
                    <action.icon size={15} className="text-brand-light" />
                    <span className="text-sm text-text-secondary hover:text-white transition-colors">
                      {action.label}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}