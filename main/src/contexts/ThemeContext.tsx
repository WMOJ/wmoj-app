"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import {
    DARK_SCHEME_QUERY,
    isThemeSetting,
    nextThemeSetting,
    resolveTheme,
    THEME_STORAGE_KEY,
    type ResolvedTheme,
    type ThemeSetting,
} from "@/lib/theme";

interface ThemeContextType {
    /** What the user chose: light, dark, or follow the OS. */
    theme: ThemeSetting;
    /** What is painted right now. `system` resolves through the OS preference. */
    resolvedTheme: ResolvedTheme;
    cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Same-tab writes do not fire the `storage` event, so cycleTheme announces them itself.
const THEME_CHANGE_EVENT = "wmoj-theme-change";

const readStoredSetting = (): ThemeSetting => {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        return isThemeSetting(stored) ? stored : "system";
    } catch {
        return "system";
    }
};

const subscribeToSetting = (onChange: () => void) => {
    window.addEventListener("storage", onChange);
    window.addEventListener(THEME_CHANGE_EVENT, onChange);
    return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    };
};

const subscribeToPreference = (onChange: () => void) => {
    const media = window.matchMedia(DARK_SCHEME_QUERY);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
};

const readPreference = () => window.matchMedia(DARK_SCHEME_QUERY).matches;

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    // The server has neither the stored choice nor the OS preference, so the
    // server snapshot is null and React reads the real values only after
    // hydration. The inline script in layout.tsx has already set the class by
    // then, and the effect below rewrites the same value, so nothing flashes.
    const storedSetting = useSyncExternalStore(subscribeToSetting, readStoredSetting, () => null);
    const prefersDark = useSyncExternalStore(subscribeToPreference, readPreference, () => false);

    const resolvedTheme = resolveTheme(storedSetting, prefersDark);

    useEffect(() => {
        if (storedSetting === null) return;
        document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    }, [storedSetting, resolvedTheme]);

    const cycleTheme = useCallback(() => {
        const next = nextThemeSetting(storedSetting ?? "system");
        try {
            localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
            // Storage can be disabled. The choice still applies for this page view.
        }
        window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    }, [storedSetting]);

    const value = useMemo(
        () => ({ theme: storedSetting ?? "system", resolvedTheme, cycleTheme }),
        [storedSetting, resolvedTheme, cycleTheme],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
