export type ThemeName = "light" | "dark";

export type AppTheme = {
  name: ThemeName;
  background: string;
  card: string;
  cardMuted: string;
  border: string;
  text: string;
  subtext: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  pill: string;
  gradient: [string, string];
  gradientMuted: [string, string];
};

const secondaryGradient: [string, string] = ["#14d872", "#0a8bff"];
const mutedGradient: [string, string] = ["#b9ffe1", "#c3e6ff"];

export const lightTheme: AppTheme = {
  name: "light",
  background: "#F4F7FB",
  card: "#FFFFFF",
  cardMuted: "#EEF2F7",
  border: "rgba(15, 23, 42, 0.08)",
  text: "#0F172A",
  subtext: "#6B7280",
  accent: "#0EAE6C",
  success: "#12B76A",
  warning: "#F79009",
  danger: "#F04438",
  pill: "rgba(20, 216, 114, 0.12)",
  gradient: secondaryGradient,
  gradientMuted: mutedGradient,
};

export const darkTheme: AppTheme = {
  name: "dark",
  background: "#0E0E0E",
  card: "#171717",
  cardMuted: "#1F1F1F",
  border: "rgba(255, 255, 255, 0.08)",
  text: "#F8FAFC",
  subtext: "#94A3B8",
  accent: "#41F29D",
  success: "#4ADE80",
  warning: "#F97316",
  danger: "#F87171",
  pill: "rgba(65, 242, 157, 0.14)",
  gradient: secondaryGradient,
  gradientMuted: mutedGradient,
};
