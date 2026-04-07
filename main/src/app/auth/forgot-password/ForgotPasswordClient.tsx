'use client';

import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LoadingSpinner } from '@/components/AnimationWrapper';

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) {
        setError(error.message);
      } else {
        setSent(true);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Link href="/auth/login" className="text-sm text-text-muted hover:text-foreground inline-flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </div>

        <h1 className="text-2xl font-semibold text-foreground mb-1">Forgot password</h1>
        <p className="text-sm text-text-muted mb-8">Enter your email and we&apos;ll send you a reset link</p>

        <div className="space-y-5">
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          {sent ? (
            <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-lg px-4 py-3 text-sm text-brand-primary">
              Check your email for a password reset link.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full h-10 px-3 bg-surface-2 border border-border rounded-lg text-sm text-foreground placeholder:text-text-muted/50 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <><LoadingSpinner size="sm" /><span>Sending...</span></> : 'Send Reset Link'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-text-muted pt-4 border-t border-border">
            Remember your password?{' '}
            <Link href="/auth/login" className="text-brand-primary font-medium hover:text-brand-secondary">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
