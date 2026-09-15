import TopNav from '@/components/TopNav';

export default function InvitationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-surface-1">
      <TopNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
