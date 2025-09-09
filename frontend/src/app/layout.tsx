import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@descope/nextjs-sdk';
import { Providers } from '@/components/providers/Providers';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CrisisAssist - Emergency Response System',
  description: 'Secure multi-agent emergency response coordination platform',
  keywords: ['emergency', 'crisis', 'response', 'multi-agent', 'coordination'],
  authors: [{ name: 'CrisisAssist Team' }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider projectId="P32MRE2ZmteTfJbXE3AK1wNIx2uC">
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="icon" href="/favicon.ico" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <meta name="theme-color" content="#2563eb" />
        </head>
        <body className={`${inter.className} antialiased`}>
          <Providers>
            <div className="min-h-screen bg-gray-50">
              {children}
            </div>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </Providers>
        </body>
      </html>
    </AuthProvider>
  );
}