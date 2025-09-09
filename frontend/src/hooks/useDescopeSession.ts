'use client';

import { useSession, useUser } from '@descope/nextjs-sdk/client';

interface SessionState {
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionToken?: string;
  user?: any;
}

export function useDescopeSession(): SessionState {
  try {
    const { isAuthenticated, isSessionLoading, sessionToken } = useSession();
    const { user, isUserLoading } = useUser();

    return {
      isAuthenticated: isAuthenticated || false,
      isLoading: isSessionLoading || isUserLoading || false,
      sessionToken: sessionToken || undefined,
      user: user || undefined
    };
  } catch (error) {
    console.warn('Descope hooks not available, using fallback session state');
    return {
      isAuthenticated: false,
      isLoading: false,
      sessionToken: undefined,
      user: undefined
    };
  }
}