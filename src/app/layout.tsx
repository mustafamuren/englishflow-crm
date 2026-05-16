import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Uzilla CRM — Sales & Lead Management',
  description: 'Professional CRM system for managing leads, contacts, appointments, sales, trainers, and students.',
  keywords: 'CRM, sales management, lead management, contact management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              style: {
                fontFamily: 'Inter, system-ui, sans-serif',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
