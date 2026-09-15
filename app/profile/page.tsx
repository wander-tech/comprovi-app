'use client';

import { useEffect, useState } from 'react';
import { getMe, updateUser, type User } from '@/lib/users';
import DefaultPermissionsManager from '@/components/DefaultPermissionsManager';
import CategoriesManager from '@/components/CategoriesManager';

type Section = 'info' | 'password' | 'categories' | 'permissions';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [section, setSection] = useState<Section>('info');
  const [form, setForm] = useState({ name: '', email: '', phone: '', cpf: '' });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getMe()
      .then((data) => {
        setUser(data);
        setForm({
          name: data.name,
          email: data.email,
          phone: data.phone ?? '',
          cpf: data.cpf ?? '',
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function updateField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function updateCpf(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
    setForm((prev) => ({ ...prev, cpf: digitsOnly }));
  }

  function updatePassword(field: keyof typeof passwordForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setPasswordForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const updated = await updateUser(String(user.idUser), {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        cpf: form.cpf || undefined,
      });
      setUser(updated);
      setSuccess('Dados atualizados com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSuccess('');
    if (passwordForm.password !== passwordForm.confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (passwordForm.password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setSaving(true);
    try {
      await updateUser(String(user.idUser), { password: passwordForm.password });
      setPasswordForm({ password: '', confirm: '' });
      setSuccess('Senha alterada com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar senha');
    } finally {
      setSaving(false);
    }
  }

  function getInitials(name: string) {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-ink-subtle text-sm">
        Carregando...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-5 mb-8">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-on-primary text-xl font-semibold shrink-0">
          {user ? getInitials(user.name) : 'U'}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-ink">{user?.name}</h1>
          <p className="text-sm text-ink-muted">{user?.email}</p>
          {user?.admin && (
            <span className="inline-block mt-1 text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Admin
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-hairline overflow-x-auto">
        <button
          onClick={() => { setSection('info'); setError(''); setSuccess(''); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px shrink-0 transition-colors ${
            section === 'info'
              ? 'border-primary text-primary'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          Dados pessoais
        </button>
        <button
          onClick={() => { setSection('password'); setError(''); setSuccess(''); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px shrink-0 transition-colors ${
            section === 'password'
              ? 'border-primary text-primary'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          Alterar senha
        </button>
        <button
          onClick={() => { setSection('categories'); setError(''); setSuccess(''); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px shrink-0 transition-colors ${
            section === 'categories'
              ? 'border-primary text-primary'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          Categorias
        </button>
        <button
          onClick={() => { setSection('permissions'); setError(''); setSuccess(''); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px shrink-0 transition-colors ${
            section === 'permissions'
              ? 'border-primary text-primary'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          Permissões padrão
        </button>
      </div>

      {/* Feedback */}
      {success && (
        <div className="mb-5 px-4 py-3 bg-success/10 border border-success/30 text-success text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-5 px-4 py-3 bg-error/10 border border-error/30 text-error text-sm">
          {error}
        </div>
      )}

      {/* Personal info form */}
      {section === 'info' && (
        <form onSubmit={handleSaveInfo} className="bg-canvas border border-hairline rounded-lg p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1.5">
              Nome completo
            </label>
            <input
              type="text"
              value={form.name}
              onChange={updateField('name')}
              required
              className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-lg text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              value={form.email}
              onChange={updateField('email')}
              required
              className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-lg text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-muted mb-1.5">
                Telefone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={updateField('phone')}
                placeholder="+5511987654321"
                className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-lg text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-muted mb-1.5">
                CPF
              </label>
              <input
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:bg-primary-hover active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      )}

      {/* Password form */}
      {section === 'password' && (
        <form onSubmit={handleSavePassword} className="bg-canvas border border-hairline rounded-lg p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1.5">
              Nova senha
            </label>
            <input
              type="password"
              value={passwordForm.password}
              onChange={updatePassword('password')}
              required
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-lg text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1.5">
              Confirmar nova senha
            </label>
            <input
              type="password"
              value={passwordForm.confirm}
              onChange={updatePassword('confirm')}
              required
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-lg text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus transition-colors"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:bg-primary-hover active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {saving ? 'Alterando...' : 'Alterar senha'}
            </button>
          </div>
        </form>
      )}

      {/* Categories */}
      {section === 'categories' && <CategoriesManager />}

      {/* Default permissions */}
      {section === 'permissions' && <DefaultPermissionsManager />}
    </div>
  );
}
