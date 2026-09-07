import TopNav from '@/components/TopNav';

export default function InvitationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-brand-bg">
      <TopNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
