'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from './AnimationWrapper';

interface ManagerGuardProps {
  children: React.ReactNode;
}

export function ManagerGuard({ children }: ManagerGuardProps) {
  const { user, loading, userRole } = useAuth();
  const router = useRouter();
  const [isManager, setIsManager] = useState<boolean | null>(null);
  const [checkingManager, setCheckingManager] = useState(true);

  useEffect(() => {
    if (loading) return; // Auth state not yet known

    if (!user) {
      // Not authenticated — redirect to login
      router.replace('/auth/login');
      setIsManager(false);
      setCheckingManager(false);
      return;
    }

    if (userRole === null) {
      // Role resolution still in progress — keep showing loading state.
      // This effect re-runs automatically when userRole changes.
      return;
    }

    if (userRole === 'manager') {
      setIsManager(true);
      setCheckingManager(false);
    } else {
      setIsManager(false);
      setCheckingManager(false);
      router.replace('/dashboard');
    }
  }, [user, loading, router, userRole]);

  if (loading || checkingManager || isManager === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-text-muted">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isManager) return null;

  return <>{children}</>;
}
