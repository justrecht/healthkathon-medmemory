import {
    PropsWithChildren,
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { Appearance } from "react-native";

export type ThemeMode = "light" | "dark";

export type Theme = {
  colors: {
    background: string;
    card: string;
    cardMuted: string;
    textPrimary: string;
    textSecondary: string;
    muted: string;
    border: string;
    success: string;
    warning: string;
    danger: string;
    gradient: [string, string];
    accent: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    pill: number;
  };
  typography: {
    title: number;
    heading: number;
    subheading: number;
    body: number;
    caption: number;
    fontFamily: string;
  };
};

const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
};

const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 50,
};

const typography = {
  title: 24,
  heading: 18,
  subheading: 15,
  body: 14,
  caption: 11,
  fontFamily: "Geist",
};

const lightTheme: Theme = {
  colors: {
    background: "#F6F7FB",
    card: "#FFFFFF",
    cardMuted: "#F0F2F7",
    textPrimary: "#0E1B2B",
    textSecondary: "#5E6370",
    muted: "rgba(14,27,43,0.45)",
    border: "rgba(14,27,43,0.08)",
    success: "#00C48C",
    warning: "#FFB347",
    danger: "#FF6B6B",
    gradient: ["#16A085", "#2874A6"],
    accent: "#2874A6",
  },
  spacing,
  radius,
  typography,
};

const darkTheme: Theme = {
  colors: {
    background: "#0E0E0E",
    card: "#161616",
    cardMuted: "#1F1F1F",
    textPrimary: "#F2F4FF",
    textSecondary: "#B0B6C5",
    muted: "rgba(255,255,255,0.45)",
    border: "rgba(255,255,255,0.08)",
    success: "#31D7A9",
    warning: "#FFC46B",
    danger: "#FF8686",
    gradient: ["#2CD9C5", "#1E8FE1"],
    accent: "#72E4FF",
  },
  spacing,
  radius,
  typography,
};

type ThemeContextValue = {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    // Align initial mode with current system preference so the UI does not flicker.
    const systemScheme = Appearance.getColorScheme();
    if (systemScheme === "dark" || systemScheme === "light") {
      setMode(systemScheme);
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: mode === "dark" ? darkTheme : lightTheme,
      mode,
      setMode,
      toggleMode: () => setMode((prev) => (prev === "dark" ? "light" : "dark")),
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
