"use client";

import { useAuth } from '@/contexts/AuthContext';
import { PageLoading } from '@/components/LoadingStates';

interface RegularOnlyGuardProps {
  children: React.ReactNode;
}

export function RegularOnlyGuard({ children }: RegularOnlyGuardProps) {
  const { userRole, loading, user } = useAuth();

  // Loading / transition states
  if (loading || (user && !userRole)) {
    return <PageLoading message="Preparing your workspace..." />;
  }

  // All authenticated users (regular, admin, manager) can access user-side routes
  return <>{children}</>;
}
