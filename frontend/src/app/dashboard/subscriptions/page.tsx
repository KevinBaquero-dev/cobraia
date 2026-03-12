'use client';

import { useEffect, useState } from 'react';
import { subscriptionsApi } from '@/lib/api';
import { Check, Zap, Crown, Building2, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

const planIcons: Record<string, any> = {
  BASIC: Zap,
  PRO: Crown,
  ENTERPRISE: Building2,
};

const planGradients: Record<string, string> = {
  BASIC: 'from-zinc-500/20 to-zinc-600/10 border-zinc-500/20',
  PRO: 'from-brand/20 to-accent-blue/10 border-brand/30',
  ENTERPRISE: 'from-accent-purple/20 to-accent-pink/10 border-accent-purple/30',
};

const planGlows: Record<string, string> = {
  BASIC: '',
  PRO: 'shadow-glow-teal',
  ENTERPRISE: 'shadow-glow-blue',
};

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [plansRes, currentRes]: any[] = await Promise.all([
          subscriptionsApi.getPlans(),
          subscriptionsApi.getCurrent(),
        ]);
        setPlans(plansRes?.data || []);
        setCurrent(currentRes?.data || null);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleCheckout = async (plan: string) => {
    setCheckingOut(plan);
    try {
      const res: any = await subscriptionsApi.checkout(plan);
      const link = res?.data?.paymentLink;
      if (link) window.open(link, '_blank');
    } catch {}
    finally { setCheckingOut(''); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-brand-light" />
      </div>
    );
  }

  const visiblePlans = plans.filter((plan: any) => {
  const order: Record<string, number> = { BASIC: 1, PRO: 2, ENTERPRISE: 3 };
  return order[plan.plan] >= (order[current?.plan] || 1);
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-white">Suscripción</h1>
        <p className="text-text-secondary text-sm mt-1">
          Gestiona tu plan y métodos de pago
        </p>
      </div>

      {/* Current plan banner */}
      {current && (
        <div className="glass rounded-2xl border border-brand/20 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand to-accent-blue flex items-center justify-center">
                {(() => { const Icon = planIcons[current.plan] || Zap; return <Icon size={20} className="text-white" />; })()}
              </div>
              <div>
                <p className="text-white font-semibold">Plan {current.plan} activo</p>
                <p className="text-text-muted text-sm">
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(current.price)}/mes
                  {' · '}Estado: <span className="text-brand-light">{current.status}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-muted">Uso este mes</p>
              <p className="text-white font-medium">
                {current.usage?.invoicesThisMonth} / {current.limits?.invoicesPerMonth === -1 ? '∞' : current.limits?.invoicesPerMonth} facturas
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plans grid */}
      <div>
        <h2 className="text-base font-semibold text-white mb-4">Planes disponibles</h2>
        <div className={clsx('grid gap-4', visiblePlans.length === 1 ? 'grid-cols-1 max-w-sm' : visiblePlans.length === 2 ? 'grid-cols-2 max-w-2xl' : 'grid-cols-3')}>
          {visiblePlans.map((plan: any) => {
            const isCurrentPlan = current?.plan === plan.plan;
            const Icon = planIcons[plan.plan] || Zap;
            return (
              <div
                key={plan.plan}
                className={clsx(
                  'relative rounded-2xl border bg-gradient-to-b p-5 transition-all',
                  planGradients[plan.plan],
                  planGlows[plan.plan],
                  isCurrentPlan ? 'ring-1 ring-brand/50' : ''
                )}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full bg-brand text-white text-xs font-medium">
                      Plan actual
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    plan.plan === 'BASIC' ? 'bg-zinc-500/20' :
                    plan.plan === 'PRO' ? 'bg-brand/20' : 'bg-accent-purple/20'
                  )}>
                    <Icon size={18} className={
                      plan.plan === 'BASIC' ? 'text-zinc-400' :
                      plan.plan === 'PRO' ? 'text-brand-light' : 'text-accent-purple'
                    } />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{plan.plan}</p>
                    <p className="text-2xl font-bold text-white">{plan.priceFormatted}<span className="text-sm font-normal text-text-muted">/mes</span></p>
                  </div>
                </div>

                <div className="space-y-2.5 mb-5">
                  {[
                    `${plan.limits.invoicesPerMonth === -1 ? 'Facturas ilimitadas' : `${plan.limits.invoicesPerMonth} facturas/mes`}`,
                    `${plan.limits.users} usuario${plan.limits.users > 1 ? 's' : ''}`,
                    `${plan.limits.templates} plantilla${plan.limits.templates > 1 ? 's' : ''}`,
                    plan.limits.chatbot ? 'Chatbot IA web' : null,
                    plan.limits.whatsapp ? 'WhatsApp Business' : null,
                  ].filter(Boolean).map((feature: any) => (
                    <div key={feature} className="flex items-center gap-2.5 text-sm">
                      <Check size={13} className="text-brand-light shrink-0" />
                      <span className="text-text-secondary">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => !isCurrentPlan && handleCheckout(plan.plan)}
                  disabled={isCurrentPlan || checkingOut === plan.plan}
                  className={clsx(
                    'w-full py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2',
                    isCurrentPlan
                      ? 'bg-surface-2 text-text-muted cursor-default border border-border'
                      : plan.plan === 'PRO'
                      ? 'bg-brand hover:bg-brand-light text-white'
                      : plan.plan === 'ENTERPRISE'
                      ? 'bg-accent-purple/80 hover:bg-accent-purple text-white'
                      : 'border border-border text-text-secondary hover:text-white hover:border-border-light'
                  )}
                >
                  {checkingOut === plan.plan && <Loader2 size={14} className="animate-spin" />}
                  {isCurrentPlan ? 'Plan actual' : `Cambiar a ${plan.plan}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <div className="glass rounded-2xl border border-border p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Información de pagos</h3>
        <p className="text-sm text-text-secondary">
          Los pagos se procesan de forma segura a través de <span className="text-white">Wompi Colombia</span>.
          Al hacer clic en "Cambiar plan" serás redirigido al portal de pago. Una vez confirmado el pago,
          tu plan se actualizará automáticamente.
        </p>
      </div>
    </div>
  );
}