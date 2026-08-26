'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { register, saveTokens } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '', cpf: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function updateCpf(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
    setForm((prev) => ({ ...prev, cpf: digitsOnly }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (form.password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const { accessToken, refreshToken } = await register(
        form.name,
        form.email,
        form.password,
        form.phone || undefined,
        form.cpf || undefined,
      );
      saveTokens(accessToken, refreshToken);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-brand-bg px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-brand-fg">Comprovi</h1>
          <p className="text-gray-500 mt-2 text-sm dark:text-brand-muted">Crie sua conta gratuitamente</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 dark:bg-brand-surface dark:border-brand-muted/20">
          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm dark:bg-red-950/40 dark:border-red-900 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
                Nome completo <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={update('name')}
                required
                autoComplete="name"
                placeholder="João Silva"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-shadow dark:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-fg dark:placeholder-brand-muted"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
                E-mail <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={update('email')}
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-shadow dark:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-fg dark:placeholder-brand-muted"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
                  Telefone
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={update('phone')}
                  autoComplete="tel"
                  placeholder="+5511987654321"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-shadow dark:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-fg dark:placeholder-brand-muted"
                />
              </div>
              <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
                  CPF
                </label>
                <input
                  id="cpf"
                  type="text"
                  inputMode="numeric"
                  value={form.cpf}
                  onChange={updateCpf}
                  placeholder="12345678901"
                  maxLength={11}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-shadow dark:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-fg dark:placeholder-brand-muted"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
                Senha <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={update('password')}
                required
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-shadow dark:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-fg dark:placeholder-brand-muted"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
                Confirmar senha <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-shadow dark:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-fg dark:placeholder-brand-muted"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors mt-2"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6 dark:text-brand-muted">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-brand-primary font-semibold hover:text-brand-primary dark:text-brand-primary dark:hover:text-brand-primary/80">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
