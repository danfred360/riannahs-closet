import { Platform } from "react-native";

export const Colors = {
  light: {
    primary: "#8B6F47",
    accent: "#C19A6B",
    text: "#2C2416",
    textSecondary: "#6B5D4F",
    buttonText: "#FFFFFF",
    tabIconDefault: "#6B5D4F",
    tabIconSelected: "#8B6F47",
    link: "#8B6F47",
    backgroundRoot: "#FAF8F5",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F5F2ED",
    backgroundTertiary: "#EBE6DE",
    border: "#E8E3DB",
    success: "#7A9B76",
    error: "#C75050",
    overlay: "rgba(0,0,0,0.4)",
  },
  dark: {
    primary: "#C19A6B",
    accent: "#8B6F47",
    text: "#F5F2ED",
    textSecondary: "#B5A99A",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: "#C19A6B",
    link: "#C19A6B",
    backgroundRoot: "#1F2123",
    backgroundDefault: "#2A2C2E",
    backgroundSecondary: "#353739",
    backgroundTertiary: "#404244",
    border: "#404244",
    success: "#7A9B76",
    error: "#E07070",
    overlay: "rgba(0,0,0,0.6)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  title: {
    fontSize: 32,
    fontWeight: "700" as const,
    fontFamily: "CormorantGaramond_700Bold",
  },
  heading: {
    fontSize: 24,
    fontWeight: "600" as const,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  subheading: {
    fontSize: 18,
    fontWeight: "500" as const,
    fontFamily: "Inter_500Medium",
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    fontFamily: "Inter_400Regular",
  },
  caption: {
    fontSize: 14,
    fontWeight: "400" as const,
    fontFamily: "Inter_400Regular",
  },
  small: {
    fontSize: 12,
    fontWeight: "400" as const,
    fontFamily: "Inter_400Regular",
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "Inter_400Regular",
    serif: "CormorantGaramond_400Regular",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "Inter_400Regular",
    serif: "CormorantGaramond_400Regular",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "Inter_400Regular, system-ui, -apple-system, sans-serif",
    serif: "CormorantGaramond_400Regular, Georgia, serif",
    rounded: "'SF Pro Rounded', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, monospace",
  },
});

export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
};
