import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ThemeProvider } from "next-themes";

type AppTheme = "light" | "dark";

type AppThemeContextValue = {
  theme: AppTheme;
  isDarkMode: boolean;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
};

const THEME_SESSION_KEY = "datara-theme-session";

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function getInitialTheme(): AppTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  const sessionTheme = window.sessionStorage.getItem(THEME_SESSION_KEY);
  return sessionTheme === "dark" ? "dark" : "light";
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(getInitialTheme);

  const setTheme = useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme);

    if (typeof window === "undefined") {
      return;
    }

    if (nextTheme === "dark") {
      window.sessionStorage.setItem(THEME_SESSION_KEY, nextTheme);
      return;
    }

    window.sessionStorage.removeItem(THEME_SESSION_KEY);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      theme,
      isDarkMode: theme === "dark",
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    root.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <AppThemeContext.Provider value={value}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        forcedTheme={theme}
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within an AppThemeProvider");
  }

  return context;
}
