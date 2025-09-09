'use client';

import { useDescopeSession } from '@/hooks/useDescopeSession';

export function SessionDebug() {
  const session = useDescopeSession();
  
  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-sm">
      <h3 className="font-bold mb-2">Session Debug</h3>
      <pre className="whitespace-pre-wrap">
        {JSON.stringify(session, null, 2)}
      </pre>
    </div>
  );
}