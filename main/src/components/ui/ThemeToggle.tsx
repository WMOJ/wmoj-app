"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { nextThemeSetting, type ThemeSetting } from "@/lib/theme";

const LABELS: Record<ThemeSetting, string> = {
    light: "Light",
    dark: "Dark",
    system: "System",
};

// The icon shows the current choice, not the one a click will switch to, so
// "system" is visibly different from a fixed light or dark.
const ICONS: Record<ThemeSetting, React.ReactNode> = {
    light: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    ),
    dark: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    ),
    system: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12H3V5.25" />
    ),
};

/**
 * One icon button that cycles light, dark, system. Lives in the navbar and
 * the staff header, and on the auth pages, which have neither.
 */
export const ThemeToggle = ({ className = "" }: { className?: string }) => {
    const { theme, cycleTheme } = useTheme();
    const label = `Theme: ${LABELS[theme]}. Switch to ${LABELS[nextThemeSetting(theme)]}`;

    return (
        <button
            type="button"
            onClick={cycleTheme}
            aria-label={label}
            title={label}
            className={`h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-border bg-surface-1 text-text-muted hover:text-foreground hover:bg-surface-2 transition-colors ${className}`}
        >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {ICONS[theme]}
            </svg>
        </button>
    );
};
