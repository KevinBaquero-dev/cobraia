'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  CreditCard,
  MessageSquare,
  Settings,
  LogOut,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/clients', icon: Users, label: 'Clientes' },
  { href: '/dashboard/invoices', icon: FileText, label: 'Facturas' },
  { href: '/dashboard/statements', icon: BarChart3, label: 'Estados de Cuenta' },
  { href: '/dashboard/subscriptions', icon: CreditCard, label: 'Suscripción' },
  { href: '/dashboard/settings', icon: Settings, label: 'Configuración' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, tenant, logout } = useAuthStore();

  const planColors: Record<string, string> = {
    BASIC: 'text-zinc-400',
    PRO: 'text-brand-light',
    ENTERPRISE: 'text-accent-purple',
  };

  return (
    <aside
      className={clsx(
        'flex flex-col h-screen bg-surface border-r border-border transition-all duration-300 ease-in-out shrink-0',
        collapsed ? 'w-[60px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className={clsx(
        'flex items-center h-16 px-4 border-b border-border',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <span className="font-display text-xl font-semibold text-white tracking-wide">
            Cobra<span className="text-gradient-teal">IA</span>
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-surface-2 transition-colors"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Tenant selector */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-border">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 transition-colors group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-accent-blue flex items-center justify-center text-white text-xs font-bold shrink-0">
              {tenant?.companyName?.[0]?.toUpperCase() || 'C'}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {tenant?.companyName || 'Mi Empresa'}
              </p>
              <p className={clsx('text-xs', planColors[tenant?.plan || 'BASIC'])}>
                Plan {tenant?.plan || 'BASIC'}
              </p>
            </div>
            <ChevronDown size={14} className="text-text-muted shrink-0" />
          </button>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                collapsed ? 'justify-center' : '',
                isActive
                  ? 'bg-surface-2 text-white'
                  : 'text-text-secondary hover:text-white hover:bg-surface-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-5 rounded-full bg-gradient-to-b from-brand to-accent-blue" />
              )}
              <item.icon size={17} className={clsx(
                'shrink-0 transition-colors',
                isActive ? 'text-brand-light' : 'text-current'
              )} />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Plan upgrade banner */}
      {!collapsed && tenant?.plan === 'BASIC' && (
        <div className="px-3 py-2">
          <Link href="/dashboard/subscriptions">
            <div className="glass rounded-xl p-3 border border-brand/20 hover:border-brand/40 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={13} className="text-brand-light" />
                <span className="text-xs font-semibold text-brand-light">Upgrade a Pro</span>
              </div>
              <p className="text-xs text-text-muted">Facturas ilimitadas y chatbot IA</p>
            </div>
          </Link>
        </div>
      )}

      {/* User bottom */}
      <div className={clsx(
        'border-t border-border p-3',
        collapsed ? 'flex justify-center' : ''
      )}>
        {collapsed ? (
          <button
            onClick={logout}
            className="p-2 rounded-lg text-text-secondary hover:text-white hover:bg-surface-2 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-sm font-medium text-white shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-text-muted truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-surface-2 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}