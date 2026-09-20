import Link from 'next/link';

import { formatStatCount, type PlatformStats } from '@/lib/platformStats';

export interface WelcomeBannerProps {
  stats: PlatformStats;
}

/**
 * Landing page welcome card adapting the DMOJ welcome card pattern to WMOJ's light design system.
 * Displays live database statistics, links to GitHub, registration, and the starter problem CCC 2026 J1.
 */
export function WelcomeBanner({ stats }: WelcomeBannerProps) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="bg-surface-2 px-6 h-9 border-b border-border flex items-center justify-between min-w-0 gap-2">
        <h2 className="text-sm font-semibold text-foreground truncate">
          Welcome to the WMOJ: Modern Online Judge!
        </h2>
        <svg
          className="w-4 h-4 text-text-muted shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v4m0 3.5h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div className="p-6 space-y-3 text-sm text-text-muted leading-relaxed">
        <p>
          The WMOJ is a modern contest platform and archive of programming problems. It&apos;s also entirely{' '}
          <a
            href="https://github.com/WMOJ"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-primary hover:text-brand-secondary underline underline-offset-2 transition-colors"
          >
            open source
          </a>
          .
        </p>
        <p>
          So far, <strong className="font-semibold text-foreground">{formatStatCount(stats.developersCount)}</strong> developers have submitted to{' '}
          <strong className="font-semibold text-foreground">{formatStatCount(stats.problemsCount)}</strong> problems a total of{' '}
          <strong className="font-semibold text-foreground">{formatStatCount(stats.submissionsCount)}</strong> times, using{' '}
          <strong className="font-semibold text-foreground">{formatStatCount(stats.languagesCount)}</strong> languages.
        </p>
        <p>
          If this is your first visit, please{' '}
          <Link
            href="/auth/signup"
            className="text-brand-primary hover:text-brand-secondary underline underline-offset-2 transition-colors"
          >
            register
          </Link>{' '}
          an account. Then, try the{' '}
          <Link
            href="/problems/ccc26j1"
            className="text-brand-primary hover:text-brand-secondary underline underline-offset-2 transition-colors"
          >
            CCC 2026 J1
          </Link>{' '}
          problem.
        </p>
      </div>
    </div>
  );
}
