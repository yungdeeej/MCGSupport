import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="main" className="flex-1">
        <div className="container-page max-w-md py-24 text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            404
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tightish">Page not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            That link doesn&apos;t exist anymore, or you don&apos;t have access to it.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild>
              <Link href="/">Back to home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/kb">Browse the KB</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
