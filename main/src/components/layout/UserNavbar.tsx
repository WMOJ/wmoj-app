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
        label: "Dashboard",
        href: "/dashboard",
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
        ),
    },
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
        {isActive && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-t-full" />
        )}
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

    if (!user) return null;

    const displayName = profile?.username || user.user_metadata?.username || user.email || "User";
    const initial = displayName.charAt(0).toUpperCase();

    const switchButton = (() => {
        if (userRole === "admin") return { label: "Switch to Admin Panel", path: "/admin/dashboard" };
        if (userRole === "manager") return { label: "Switch to Manager Panel", path: "/manager/dashboard" };
        return null;
    })();

    return (
        <header className="sticky top-0 z-40 h-14 border-b border-border bg-background flex items-center px-6 gap-6">
            <Logo size="md" />

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
        </header>
    );
};
