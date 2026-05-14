import Link from 'next/link';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/auth/session';
import { LogOut, User } from 'lucide-react';

export async function Header() {
  const session = await getSession();
  const isAuthed = !!session;
  const isAgent = session?.userType === 'agent';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center" aria-label="MCG Support home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/kb"
            className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex px-3 py-2 rounded-md"
          >
            Knowledge Base
          </Link>
          {isAuthed && !isAgent && (
            <>
              <Link
                href="/chat"
                className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex px-3 py-2 rounded-md"
              >
                Assistant
              </Link>
              <Link
                href="/tickets"
                className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex px-3 py-2 rounded-md"
              >
                My tickets
              </Link>
            </>
          )}
          {isAgent && (
            <Link
              href="/admin/inbox"
              className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex px-3 py-2 rounded-md"
            >
              Inbox
            </Link>
          )}
          <ThemeToggle />
          {isAuthed ? (
            <form action="/api/auth/logout" method="post">
              <Button type="submit" variant="ghost" size="sm" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">
                <User className="h-4 w-4" />
                <span>Sign in</span>
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
