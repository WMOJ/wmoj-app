"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const Header = () => {
    const { user, profile, userRole, signOut } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        await signOut();
        router.push("/");
    };

    if (!user) return null;

    const displayName = profile?.username || user.user_metadata?.username || user.email || "User";
    const initial = displayName.charAt(0).toUpperCase();

    const switchButton = (() => {
        if (userRole === 'admin') {
            if (pathname.startsWith('/admin')) {
                return { label: 'Switch to User View', path: '/' };
            }
            return { label: 'Switch to Admin Panel', path: '/admin/dashboard' };
        }
        if (userRole === 'manager') {
            if (pathname.startsWith('/manager')) {
                return { label: 'Switch to User View', path: '/' };
            }
            return { label: 'Switch to Manager Panel', path: '/manager/dashboard' };
        }
        return null;
    })();

    return (
        <header className="sticky top-0 z-40 h-14 border-b border-border bg-background flex items-center justify-end px-6 gap-3">
            <ThemeToggle />
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-2 text-sm"
                >
                    <div className="w-7 h-7 rounded-lg bg-brand-primary flex items-center justify-center text-white text-xs font-semibold">
                        {initial}
                    </div>
                    <span className="font-medium text-foreground hidden sm:block">
                        {displayName}
                    </span>
                    <svg
                        className={`w-3.5 h-3.5 text-text-muted ${isMenuOpen ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isMenuOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-surface-1 border border-border rounded-lg py-1 shadow-lg">
                        {switchButton && (
                            <button
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    router.push(switchButton.path);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-surface-2"
                            >
                                {switchButton.label}
                            </button>
                        )}
                        <div className="h-px bg-border my-1" />
                        <button
                            onClick={handleSignOut}
                            className="block w-full text-left px-4 py-2 text-sm text-error hover:bg-surface-2"
                        >
                            Sign Out
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};
