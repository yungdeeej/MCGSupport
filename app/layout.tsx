import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import { cn } from '@/lib/utils';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'MCG Student Support',
  description: 'Get instant answers about your classes, schedule, Moodle, and more.',
  applicationName: 'MCG Support',
  authors: [{ name: 'MCG Career College' }],
  metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
  robots: { index: true, follow: true },
  openGraph: {
    title: 'MCG Student Support',
    description: 'AI-first student support portal for MCG Career College.',
    type: 'website',
    siteName: 'MCG Support',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fa991d' },
    { media: '(prefers-color-scheme: dark)', color: '#1d2c3c' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = cookies().get('mcg_theme')?.value;
  const className = theme === 'dark' ? 'dark' : '';
  return (
    <html lang="en" suppressHydrationWarning className={className}>
      <body className={cn(inter.variable, mono.variable, 'min-h-dvh bg-background font-sans text-foreground')}>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
