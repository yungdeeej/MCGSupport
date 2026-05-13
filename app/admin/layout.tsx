import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.userType !== 'agent') redirect('/login');
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <div className="border-b border-border bg-muted/30">
        <div className="container-page flex h-12 items-center gap-4 text-sm">
          <span className="font-medium">Admin</span>
          <Link href="/admin/inbox" className="text-muted-foreground hover:text-foreground">
            Inbox
          </Link>
          <Link href="/admin/kb" className="text-muted-foreground hover:text-foreground">
            Knowledge Base
          </Link>
          <Link href="/admin/metrics" className="text-muted-foreground hover:text-foreground">
            Metrics
          </Link>
          {session.role === 'admin' && (
            <Link href="/admin/users" className="text-muted-foreground hover:text-foreground">
              Users
            </Link>
          )}
        </div>
      </div>
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
