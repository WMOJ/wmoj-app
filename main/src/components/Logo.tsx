import Image from 'next/image';
import Link from 'next/link';

const SIZE_MAP = {
  sm: 28,
  md: 36,
  lg: 48,
} as const;

const TEXT_SIZE_MAP = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
} as const;

export type LogoSize = keyof typeof SIZE_MAP;

interface LogoProps {
  className?: string;
  textClassName?: string;
  withText?: boolean;
  size?: LogoSize;
  href?: string | null;
  priority?: boolean;
  badge?: string;
}

export function Logo({
  className = '',
  textClassName = '',
  withText = true,
  size = 'md',
  href = '/',
  priority = false,
  badge,
}: LogoProps) {
  const imageSize = SIZE_MAP[size];
  const wrapperSize = imageSize + 14;
  const textSizeClass = TEXT_SIZE_MAP[size];

  const content = (
    <>
      <Image
        src="/logo.png"
        alt="WMOJ logo"
        width={wrapperSize}
        height={wrapperSize}
        priority={priority}
        className="object-contain"
      />
      {withText && (
        <span className={`flex flex-col items-start leading-none ${textSizeClass} font-semibold tracking-wide text-foreground ${textClassName}`}>
          <span>
            <span>WM</span>
            <span className="text-brand-primary">::</span>
            <span>OJ</span>
          </span>
          {badge && (
            <span className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-brand-primary/80">
              {badge}
            </span>
          )}
        </span>
      )}
    </>
  );

  if (!href) {
    return (
      <div className={`group inline-flex items-center gap-3 ${className}`} aria-label="WMOJ logo">
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className={`group inline-flex items-center gap-3 ${className}`} aria-label="WMOJ home">
      {content}
    </Link>
  );
}
