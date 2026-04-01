"use client";

import React, { createContext, useContext, useEffect } from "react";

interface ThemeContextType {
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("dark");
        root.classList.add("light");
        localStorage.removeItem("theme");
    }, []);

    return (
        <ThemeContext.Provider value={{ theme: "light", toggleTheme: () => {} }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
