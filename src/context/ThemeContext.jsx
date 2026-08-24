import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const ThemeContext = createContext(null);

const THEME_STORAGE_KEY = "settings.theme";

/**
 * Reads the saved theme preference from localStorage.
 * Returns one of: "light" | "dark" | "system" (defaults to "system").
 */
const loadThemeMode = () => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage unavailable - ignore
  }
  return "system";
};

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeModeState] = useState(loadThemeMode);

  /**
   * Resolve the effective theme ("light" or "dark") based on the chosen mode.
   * "system" follows the OS prefers-color-scheme (defaults to dark).
   */
  const getResolvedTheme = useCallback(() => {
    if (themeMode === "light") return "light";
    if (themeMode === "dark") return "dark";

    // system mode
    try {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
      return prefersDark.matches ? "dark" : "light";
    } catch {
      return "dark";
    }
  }, [themeMode]);

  const [resolvedTheme, setResolvedTheme] = useState(getResolvedTheme);

  // Apply the resolved theme to the document root as a data attribute.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [resolvedTheme]);

  // Re-resolve when the selected mode changes.
  useEffect(() => {
    setResolvedTheme(getResolvedTheme());
  }, [themeMode, getResolvedTheme]);

  // When in "system" mode, live-follow OS theme changes.
  useEffect(() => {
    if (themeMode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      setResolvedTheme(e.matches ? "dark" : "light");
    };

    // Modern browsers use addEventListener; older Safari uses addListener.
    mediaQuery.addEventListener
      ? mediaQuery.addEventListener("change", handleChange)
      : mediaQuery.addListener(handleChange);

    return () => {
      mediaQuery.removeEventListener
        ? mediaQuery.removeEventListener("change", handleChange)
        : mediaQuery.removeListener(handleChange);
    };
  }, [themeMode]);

  /**
   * Updates the theme mode and persists it to localStorage.
   */
  const setThemeMode = (mode) => {
    if (mode !== "light" && mode !== "dark" && mode !== "system") return;
    setThemeModeState(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // localStorage unavailable - ignore
    }
  };

  const value = {
    themeMode,
    resolvedTheme,
    setThemeMode,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

/**
 * Custom hook to consume ThemeContext safely.
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeContext;
