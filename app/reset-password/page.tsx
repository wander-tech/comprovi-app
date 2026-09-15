'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPassword } from '@/lib/auth';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Token de redefinição inválido ou expirado');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-ink mb-2">Link inválido</h2>
        <p className="text-sm text-ink-muted mb-6">
          O link de redefinição de senha é inválido ou expirou.
        </p>
        <Link href="/forgot-password" className="text-sm text-primary font-semibold hover:underline">
          Solicitar novo link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-ink mb-2">Senha redefinida!</h2>
        <p className="text-sm text-ink-muted mb-6">
          Sua senha foi atualizada com sucesso. Agora você pode entrar com a nova senha.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="px-6 py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:bg-primary-hover active:scale-95 transition"
        >
          Ir para o login
        </button>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-ink-muted mb-6">Escolha uma nova senha para sua conta.</p>

      {error && (
        <div className="mb-5 px-4 py-3 bg-error/10 border border-error/30 text-error text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-ink-muted mb-1.5">
            Nova senha
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
            className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-lg text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus transition-colors"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-muted mb-1.5">
            Confirmar nova senha
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-lg text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:bg-primary-hover active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-1 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-ink">Comprovi</h1>
          <p className="text-ink-muted mt-2 text-sm">Redefinição de senha</p>
        </div>

        <div className="bg-canvas border border-hairline rounded-lg p-8">
          <Suspense fallback={<div className="text-center text-sm text-ink-muted">Carregando...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>

        <p className="text-center text-sm text-ink-muted mt-6">
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
