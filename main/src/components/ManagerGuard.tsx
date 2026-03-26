'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from './AnimationWrapper';

interface ManagerGuardProps {
  children: React.ReactNode;
}

/**
 * ManagerGuard renders its children once the auth context has initialized.
 *
 * Access control is enforced server-side in every manager page.tsx before the
 * client component is rendered, so this guard deliberately does NOT re-check
 * the user's role in the browser. Doing so caused a race condition where a
 * stale or not-yet-refreshed access token caused the browser-side role query
 * to return 'regular', incorrectly redirecting managers on page reload.
 *
 * This guard exists only to:
 *  1. Show a loading spinner while auth context initializes (avoids flash).
 *  2. Return null if there is no authenticated user — the wrapping AuthGuard
 *     handles the redirect to /auth/login.
 */
export function ManagerGuard({ children }: ManagerGuardProps) {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-text-muted">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
