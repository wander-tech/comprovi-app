import TopNav from '@/components/TopNav';

export default function SpreadsheetsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <TopNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
