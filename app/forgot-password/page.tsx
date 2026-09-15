'use client';

import { useState } from 'react';
import Link from 'next/link';
import { forgotPassword } from '@/lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar redefinição');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-1 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-ink">Comprovi</h1>
          <p className="text-ink-muted mt-2 text-sm">Redefinição de senha</p>
        </div>

        <div className="bg-canvas border border-hairline rounded-lg p-8">
          {success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-ink mb-2">E-mail enviado!</h2>
              <p className="text-sm text-ink-muted mb-6">
                Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá as instruções para redefinir sua senha.
              </p>
              <Link
                href="/login"
                className="text-sm text-primary font-semibold hover:underline"
              >
                Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-ink-muted mb-6">
                Informe seu e-mail e enviaremos um link para você redefinir sua senha.
              </p>

              {error && (
                <div className="mb-5 px-4 py-3 bg-error/10 border border-error/30 text-error text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-ink-muted mb-1.5">
                    E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="seu@email.com"
                    className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-lg text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:bg-primary-hover active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {loading ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
              </form>
            </>
          )}
        </div>

        {!success && (
          <p className="text-center text-sm text-ink-muted mt-6">
            Lembrou a senha?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Voltar ao login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
