import { StatusBar } from "expo-status-bar";
import { ReactNode, createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import { AppTheme, ThemeName, darkTheme, lightTheme } from "./themes";

type ThemeContextValue = {
  theme: AppTheme;
  themeName: ThemeName;
  toggleTheme: () => void;
  setTheme: (value: ThemeName) => void;
};

const defaultValue: ThemeContextValue = {
  theme: lightTheme,
  themeName: "light",
  toggleTheme: () => undefined,
  setTheme: () => undefined,
};

const ThemeContext = createContext<ThemeContextValue>(defaultValue);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useColorScheme();
  const [themeName, setThemeName] = useState<ThemeName>(
    deviceScheme === "dark" ? "dark" : "light"
  );

  const value = useMemo(() => {
    const selectedTheme = themeName === "dark" ? darkTheme : lightTheme;

    return {
      theme: selectedTheme,
      themeName,
      toggleTheme: () => setThemeName((prev) => (prev === "dark" ? "light" : "dark")),
      setTheme: (value: ThemeName) => setThemeName(value),
    };
  }, [themeName]);

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={themeName === "dark" ? "light" : "dark"} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
