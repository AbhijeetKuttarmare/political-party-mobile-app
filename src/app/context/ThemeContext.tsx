import { createContext, useContext, useState } from "react";

interface ThemeContextType {
  isDark: boolean;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ isDark: true, toggleDark: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("ncp_dark_mode");
      return stored !== null ? stored === "true" : true;
    } catch {
      return true;
    }
  });

  const toggleDark = () => {
    setIsDark(v => {
      const next = !v;
      try { localStorage.setItem("ncp_dark_mode", String(next)); } catch {}
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

/** Returns the two class-strings for a given dark/light pair. */
export function tc(isDark: boolean, dark: string, light: string) {
  return isDark ? dark : light;
}
