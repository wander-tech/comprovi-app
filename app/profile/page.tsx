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
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-brand-muted text-sm">
        Carregando...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-5 mb-8">
        <div className="w-16 h-16 rounded-full bg-brand-primary flex items-center justify-center text-white text-xl font-bold shrink-0">
          {user ? getInitials(user.name) : 'U'}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-brand-fg">{user?.name}</h1>
          <p className="text-sm text-gray-500 dark:text-brand-muted">{user?.email}</p>
          {user?.admin && (
            <span className="inline-block mt-1 text-xs font-medium bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/60 dark:text-brand-primary px-2 py-0.5 rounded-full">
              Admin
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto dark:border-brand-muted/20">
        <button
          onClick={() => { setSection('info'); setError(''); setSuccess(''); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px shrink-0 transition-colors ${
            section === 'info'
              ? 'border-brand-primary text-brand-primary dark:text-brand-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-brand-muted dark:hover:text-brand-fg'
          }`}
        >
          Dados pessoais
        </button>
        <button
          onClick={() => { setSection('password'); setError(''); setSuccess(''); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px shrink-0 transition-colors ${
            section === 'password'
              ? 'border-brand-primary text-brand-primary dark:text-brand-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-brand-muted dark:hover:text-brand-fg'
          }`}
        >
          Alterar senha
        </button>
        <button
          onClick={() => { setSection('categories'); setError(''); setSuccess(''); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px shrink-0 transition-colors ${
            section === 'categories'
              ? 'border-brand-primary text-brand-primary dark:text-brand-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-brand-muted dark:hover:text-brand-fg'
          }`}
        >
          Categorias
        </button>
        <button
          onClick={() => { setSection('permissions'); setError(''); setSuccess(''); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px shrink-0 transition-colors ${
            section === 'permissions'
              ? 'border-brand-primary text-brand-primary dark:text-brand-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-brand-muted dark:hover:text-brand-fg'
          }`}
        >
          Permissões padrão
        </button>
      </div>

      {/* Feedback */}
      {success && (
        <div className="mb-5 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm dark:bg-green-950/40 dark:border-green-900 dark:text-green-400">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm dark:bg-red-950/40 dark:border-red-900 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Personal info form */}
      {section === 'info' && (
        <form onSubmit={handleSaveInfo} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 dark:bg-brand-surface dark:border-brand-muted/20">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
              Nome completo
            </label>
            <input
              type="text"
              value={form.name}
              onChange={updateField('name')}
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-shadow dark:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-fg dark:placeholder-brand-muted"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
              E-mail
            </label>
            <input
              type="email"
              value={form.email}
              onChange={updateField('email')}
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-shadow dark:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-fg dark:placeholder-brand-muted"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
                Telefone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={updateField('phone')}
                placeholder="+5511987654321"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-shadow dark:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-fg dark:placeholder-brand-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
                CPF
              </label>
              <input
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      )}

      {/* Password form */}
      {section === 'password' && (
        <form onSubmit={handleSavePassword} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 dark:bg-brand-surface dark:border-brand-muted/20">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
              Nova senha
            </label>
            <input
              type="password"
              value={passwordForm.password}
              onChange={updatePassword('password')}
              required
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-shadow dark:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-fg dark:placeholder-brand-muted"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
              Confirmar nova senha
            </label>
            <input
              type="password"
              value={passwordForm.confirm}
              onChange={updatePassword('confirm')}
              required
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-shadow dark:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-fg dark:placeholder-brand-muted"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
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
