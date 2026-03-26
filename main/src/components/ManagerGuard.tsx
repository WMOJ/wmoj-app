'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSpinner } from './AnimationWrapper';

interface ManagerGuardProps {
  children: React.ReactNode;
}

export function ManagerGuard({ children }: ManagerGuardProps) {
  const { user, loading, userRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    // Wait until AuthContext has resolved the role — never redirect on null
    if (userRole === null) return;

    if (userRole !== 'manager') {
      router.replace('/dashboard');
    }
  }, [user, loading, userRole, router]);

  // Show spinner while auth is loading or role is still being resolved
  if (loading || !user || userRole === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-text-muted">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (userRole !== 'manager') return null;

  return <>{children}</>;
}
