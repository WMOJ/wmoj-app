'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from './AnimationWrapper';

interface ManagerGuardProps {
  children: React.ReactNode;
}

export function ManagerGuard({ children }: ManagerGuardProps) {
  const { user, session, loading, userRole } = useAuth();
  const router = useRouter();
  const [isManager, setIsManager] = useState<boolean | null>(null);
  const [checkingManager, setCheckingManager] = useState(true);

  useEffect(() => {
    const checkManagerStatus = async () => {
      if (!user || !session || loading) return;

      if (userRole === 'manager') {
        setIsManager(true);
        setCheckingManager(false);
        return;
      } else if (userRole === 'admin' || userRole === 'regular') {
        setIsManager(false);
        setCheckingManager(false);
        router.replace('/dashboard');
        return;
      }

      // Fallback: role not yet known; perform API check
      try {
        const res = await fetch('/api/manager/check', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });

        if (res.ok) {
          setIsManager(true);
        } else {
          setIsManager(false);
          router.replace('/dashboard');
        }
      } catch (error) {
        console.error('Error checking manager status:', error);
        setIsManager(false);
        router.replace('/dashboard');
      } finally {
        setCheckingManager(false);
      }
    };

    checkManagerStatus();
  }, [user, session, loading, router, userRole]);

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
