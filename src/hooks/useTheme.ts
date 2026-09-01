import { useEffect, useState } from "react";

export type ThemeName = "dark" | "light";

const STORAGE_KEY = "wp-theme";

// The chosen theme, persisted and applied to <html data-theme>.
export function useTheme() {
  const [theme, setTheme] = useState<ThemeName>(
    () => (localStorage.getItem(STORAGE_KEY) as ThemeName) || "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggle };
}
