'use client';

import { ApiProvider } from './ApiProvider';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ApiProvider>
      {children}
    </ApiProvider>
  );
}