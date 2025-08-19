import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/providers/providers';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'Easy e-Invoice',
  description: 'Malaysian e-Invoice compliance helper for micro-SMEs',
  keywords: ['e-invoice', 'malaysia', 'tax', 'compliance', 'SME', 'LHDN'],
  authors: [{ name: 'Easy e-Invoice Team' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <ErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}