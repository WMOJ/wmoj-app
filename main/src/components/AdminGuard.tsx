'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from './AnimationWrapper';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading, userRole } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    if (loading) return; // Auth state not yet known

    if (!user) {
      // Not authenticated — redirect to login
      router.replace('/auth/login');
      setIsAdmin(false);
      setCheckingAdmin(false);
      return;
    }

    if (userRole === null) {
      // Role resolution still in progress — keep showing loading state.
      // This effect re-runs automatically when userRole changes.
      return;
    }

    if (userRole === 'admin') {
      setIsAdmin(true);
      setCheckingAdmin(false);
    } else {
      setIsAdmin(false);
      setCheckingAdmin(false);
      router.replace('/dashboard');
    }
  }, [user, loading, router, userRole]);

  if (loading || checkingAdmin || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-text-muted">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return <>{children}</>;
}
