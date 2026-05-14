import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-muted/30">
      <div className="container-page py-10 text-sm text-muted-foreground">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-md">
            <p className="font-medium text-foreground">MCG Career College</p>
            <p className="mt-1 text-xs leading-relaxed">
              Campuses in Calgary, Red Deer, Cold Lake, and Edmonton. This portal is for
              currently enrolled students. Data handled in accordance with PIPEDA.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-xs">
            <Link className="hover:text-foreground" href="/kb">
              Knowledge base
            </Link>
            <Link className="hover:text-foreground" href="/legal/privacy">
              Privacy
            </Link>
            <Link className="hover:text-foreground" href="/legal/terms">
              Terms
            </Link>
            <Link className="hover:text-foreground" href="/legal/accessibility">
              Accessibility
            </Link>
          </nav>
        </div>
        <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-border pt-4 text-xs sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} MCG Career College. All rights reserved.</span>
          <span>If you’re in crisis, call 911. For 24/7 mental health support call 9-8-8.</span>
        </div>
      </div>
    </footer>
  );
}
