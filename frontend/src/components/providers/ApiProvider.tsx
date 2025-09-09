'use client';

import { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { ApiClient } from '@/lib/api';
import { useDescopeSession } from '@/hooks/useDescopeSession';

interface ApiContextType {
  client: ApiClient;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

interface ApiProviderProps {
  children: ReactNode;
}

export function ApiProvider({ children }: ApiProviderProps) {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const { isAuthenticated, isLoading, sessionToken } = useDescopeSession();
  
  const client = useMemo(() => {
    return new ApiClient(baseURL, sessionToken);
  }, [baseURL, sessionToken]);

  // Update token when it changes
  useEffect(() => {
    client.updateToken(sessionToken);
  }, [client, sessionToken]);
  
  return (
    <ApiContext.Provider value={{ 
      client,
      isAuthenticated,
      isLoading
    }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context.client;
}

export function useAuth() {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an ApiProvider');
  }
  return {
    isAuthenticated: context.isAuthenticated,
    isLoading: context.isLoading
  };
}