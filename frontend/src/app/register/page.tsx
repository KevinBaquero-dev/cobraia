'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    slug: '',
  });

  const updateForm = (field: string, value: string) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'companyName') {
        updated.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }

    setError('');
    setLoading(true);

    try {
      const res: any = await authApi.register(form);
      const { user, tenant, accessToken, refreshToken } = res.data;
      setAuth(user, tenant, accessToken, refreshToken);
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-grid flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-semibold text-white">
            Cobra<span className="text-gradient-teal">IA</span>
          </h1>
          <p className="text-text-secondary text-sm mt-2">Crea tu cuenta gratis</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                s < step ? 'bg-brand text-white' :
                s === step ? 'bg-brand/20 border border-brand text-brand-light' :
                'bg-surface-2 border border-border text-text-muted'
              }`}>
                {s < step ? <Check size={13} /> : s}
              </div>
              {s < 2 && <div className={`w-8 h-px ${step > s ? 'bg-brand' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-6 border border-border">
          <h2 className="text-lg font-semibold text-white mb-1">
            {step === 1 ? 'Tu información' : 'Tu empresa'}
          </h2>
          <p className="text-text-muted text-sm mb-6">
            {step === 1 ? 'Datos de acceso a la plataforma' : 'Información de tu negocio'}
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">Nombre completo</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="Juan Pérez"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-white placeholder-text-muted text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">Correo electrónico</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    placeholder="tu@empresa.com"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-white placeholder-text-muted text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => updateForm('password', e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      required
                      minLength={8}
                      className="w-full px-4 py-2.5 pr-11 rounded-xl bg-surface-2 border border-border text-white placeholder-text-muted text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">Nombre de la empresa</label>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => updateForm('companyName', e.target.value)}
                    placeholder="Mi Empresa S.A.S"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-white placeholder-text-muted text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">
                    URL de tu espacio
                  </label>
                  <div className="flex items-center gap-0">
                    <span className="px-3 py-2.5 rounded-l-xl bg-surface-3 border border-r-0 border-border text-text-muted text-sm">
                      cobraia.co/
                    </span>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => updateForm('slug', e.target.value)}
                      placeholder="mi-empresa"
                      required
                      className="flex-1 px-4 py-2.5 rounded-r-xl bg-surface-2 border border-border text-white placeholder-text-muted text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-1">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary hover:text-white hover:border-border-light text-sm font-medium transition-colors"
                >
                  Atrás
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-light disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {step === 1 ? 'Continuar' : loading ? 'Creando...' : 'Crear cuenta'}
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-text-muted mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-brand-light hover:text-white transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}