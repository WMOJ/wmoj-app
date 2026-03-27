"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { ManagerSidebar } from "./ManagerSidebar";
import { Header } from "./Header";
import { UserNavbar } from "./UserNavbar";
import { useAuth } from "@/contexts/AuthContext";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const { user } = useAuth();

    const isLandingPage = pathname === "/";
    const isAuthPage = pathname.startsWith("/auth");
    const isAboutPage = pathname === "/about";
    const isAdminPage = pathname.startsWith("/admin");
    const isManagerPage = pathname.startsWith("/manager");
    const isPoopthrowerPage = pathname.startsWith("/poopthrower");

    // Secret game route — render nothing but the page itself
    if (isPoopthrowerPage) {
        return <>{children}</>;
    }

    const showNavigation = !isLandingPage && !isAuthPage && !isAboutPage && user;

    return (
        <div className="min-h-screen bg-background text-foreground">
            {showNavigation ? (
                isAdminPage ? (
                    <div className="flex min-h-screen">
                        <AdminSidebar />
                        <div className="flex-1 flex flex-col min-w-0 pl-60">
                            <Header />
                            <main className="flex-1 p-6">{children}</main>
                        </div>
                    </div>
                ) : isManagerPage ? (
                    <div className="flex min-h-screen">
                        <ManagerSidebar />
                        <div className="flex-1 flex flex-col min-w-0 pl-60">
                            <Header />
                            <main className="flex-1 p-6">{children}</main>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col min-h-screen w-full">
                        <UserNavbar />
                        <main className="flex-1 p-6">{children}</main>
                    </div>
                )
            ) : (
                <main className="min-h-screen">
                    {children}
                </main>
            )}
        </div>
    );
};
