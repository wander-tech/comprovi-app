'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { clearTokens } from '@/lib/auth';
import { getMe, type User } from '@/lib/users';
import { getMyInvitations } from '@/lib/invitations';
import ThemeToggle from '@/components/ThemeToggle';

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMe().then(setUser).catch(() => null);
    getMyInvitations()
      .then((list) => setPendingInvitations(list.filter((i) => i.status === 'pending').length))
      .catch(() => null);
  }, [pathname]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target as Node)) {
        setMobileNavOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  function handleLogout() {
    clearTokens();
    router.push('/login');
  }

  function getInitials(name: string) {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  const isOnDashboard = pathname === '/dashboard';

  const navLinkClass = (active: boolean) =>
    `flex items-center gap-2 text-sm font-medium transition-colors rounded-full px-2.5 py-2 sm:px-0 sm:py-0 sm:rounded-none ${
      active
        ? 'text-primary bg-primary/10 sm:bg-transparent'
        : 'text-ink-muted hover:text-ink hover:bg-surface-1 sm:hover:bg-transparent'
    }`;

  const navLinks = (
    <>
      <Link
        href="/spreadsheets"
        onClick={() => setMobileNavOpen(false)}
        className={navLinkClass(pathname.startsWith('/spreadsheets'))}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z"
          />
        </svg>
        Planilhas
      </Link>

      <Link
        href="/invitations"
        onClick={() => setMobileNavOpen(false)}
        className={navLinkClass(pathname.startsWith('/invitations'))}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        Convites
        {pendingInvitations > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-on-primary bg-error rounded-full">
            {pendingInvitations}
          </span>
        )}
      </Link>

      {user?.admin && (
        <Link
          href="/admin/users"
          onClick={() => setMobileNavOpen(false)}
          className={navLinkClass(pathname.startsWith('/admin'))}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          Administração
        </Link>
      )}

      {!isOnDashboard && (
        <Link
          href="/dashboard"
          onClick={() => setMobileNavOpen(false)}
          className={navLinkClass(false)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>
      )}
    </>
  );

  return (
    <header className="relative h-16 bg-canvas border-b border-hairline flex items-center px-4 sm:px-6 justify-between shrink-0">
      <Link
        href="/dashboard"
        className="text-lg font-semibold text-ink hover:text-primary transition-colors"
      >
        Comprovi
      </Link>

      <div className="flex items-center gap-2 sm:gap-4">
        <nav className="hidden sm:flex items-center gap-4">{navLinks}</nav>

        <div className="relative sm:hidden" ref={mobileNavRef}>
          <button
            onClick={() => setMobileNavOpen((prev) => !prev)}
            className="flex items-center justify-center w-9 h-9 rounded-full text-ink-muted hover:text-ink hover:bg-surface-1 transition-colors"
            aria-label="Menu de navegação"
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {mobileNavOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-canvas shadow-lg border border-hairline rounded-xl py-2 z-50 flex flex-col gap-1 px-2">
              {navLinks}
            </div>
          )}
        </div>

        <ThemeToggle />

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-offset-2"
            aria-label="Menu do perfil"
            aria-expanded={open}
          >
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary text-sm font-semibold select-none">
              {user ? getInitials(user.name) : '…'}
            </div>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 bg-canvas shadow-lg border border-hairline rounded-xl py-1 z-50 overflow-hidden">
              {user && (
                <div className="px-4 py-3 border-b border-hairline">
                  <p className="text-sm font-semibold text-ink truncate">{user.name}</p>
                  <p className="text-xs text-ink-muted truncate">{user.email}</p>
                  {user.admin && (
                    <span className="inline-block mt-1 text-xs font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
              )}

              <Link
                href="/profile"
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface-1 transition-colors"
                onClick={() => setOpen(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 text-ink-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Meu Perfil
              </Link>

              {user?.admin && (
                <Link
                  href="/admin/users"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface-1 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-ink-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  Gerenciar Usuários
                </Link>
              )}

              <hr className="my-1 border-hairline" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-error hover:bg-error/10 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1"
                  />
                </svg>
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
