"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const navItems = [
    {
        label: "Problems",
        href: "/problems",
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
    },
    {
        label: "Contests",
        href: "/contests",
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
    },
];

const NavItem = ({
    href,
    icon,
    label,
    isActive,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
}) => (
    <Link
        href={href}
        className={`relative flex items-center gap-2 px-3 h-full text-sm font-medium transition-colors ${
            isActive ? "text-foreground" : "text-text-muted hover:text-foreground"
        }`}
    >
        <span className={isActive ? "text-brand-primary" : ""}>{icon}</span>
        <span className="hidden sm:block">{label}</span>
    </Link>
);

export const UserNavbar = () => {
    const pathname = usePathname();
    const { user, profile, userRole, signOut } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

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

    const displayName = user
        ? (profile?.username || user.user_metadata?.username || user.email || "User")
        : null;
    const initial = displayName ? displayName.charAt(0).toUpperCase() : null;

    const switchButton = user ? (() => {
        if (userRole === "admin") return { label: "Switch to Admin Panel", path: "/admin/dashboard" };
        if (userRole === "manager") return { label: "Switch to Manager Panel", path: "/manager/dashboard" };
        return null;
    })() : null;

    return (
        <header data-navbar className="sticky top-0 z-40 h-14 border-b flex items-center px-6 gap-6">
            <Logo size="md" className="mt-1" />

            <nav className="flex items-stretch h-14 gap-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                        <NavItem
                            key={item.href}
                            href={item.href}
                            icon={item.icon}
                            label={item.label}
                            isActive={isActive}
                        />
                    );
                })}
            </nav>

            <div className="flex-1" />

            <ThemeToggle />

            {user ? (
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
                            className={`w-3.5 h-3.5 text-text-muted transition-transform ${isMenuOpen ? "rotate-180" : ""}`}
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
            ) : (
                <div className="flex items-center gap-2">
                    <Link
                        href="/auth/login"
                        className="px-4 py-1.5 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-surface-2 transition-colors"
                    >
                        Log In
                    </Link>
                    <Link
                        href="/auth/signup"
                        className="px-4 py-1.5 text-sm font-medium bg-brand-primary text-white rounded-lg hover:bg-brand-secondary transition-colors"
                    >
                        Sign Up
                    </Link>
                </div>
            )}
        </header>
    );
};
