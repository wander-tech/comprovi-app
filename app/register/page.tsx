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
    <div className="min-h-screen flex items-center justify-center bg-surface-1 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-ink">Comprovi</h1>
          <p className="text-ink-muted mt-2 text-sm">Crie sua conta gratuitamente</p>
        </div>

        <div className="bg-canvas border border-hairline rounded-lg p-8">
          {error && (
            <div className="mb-5 px-4 py-3 bg-error/10 border border-error/30 text-error text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-ink-muted mb-1.5">
                Nome completo <span className="text-error">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={update('name')}
                required
                autoComplete="name"
                placeholder="João Silva"
                className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-lg text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus transition-colors"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-muted mb-1.5">
                E-mail <span className="text-error">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={update('email')}
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-lg text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-ink-muted mb-1.5">
                  Telefone
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={update('phone')}
                  autoComplete="tel"
                  placeholder="+5511987654321"
                  className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-lg text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus transition-colors"
                />
              </div>
              <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-ink-muted mb-1.5">
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
                  className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-lg text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-muted mb-1.5">
                Senha <span className="text-error">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={update('password')}
                required
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-lg text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus transition-colors"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-muted mb-1.5">
                Confirmar senha <span className="text-error">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-lg text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:bg-primary-hover active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition mt-2"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-muted mt-6">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
