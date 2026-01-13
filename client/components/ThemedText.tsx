import { Text, type TextProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Typography } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "title" | "heading" | "subheading" | "body" | "caption" | "small" | "link";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "body",
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();

  const getColor = () => {
    if (isDark && darkColor) {
      return darkColor;
    }

    if (!isDark && lightColor) {
      return lightColor;
    }

    if (type === "link") {
      return theme.link;
    }

    if (type === "caption" || type === "small") {
      return theme.textSecondary;
    }

    return theme.text;
  };

  const getTypeStyle = () => {
    switch (type) {
      case "title":
        return Typography.title;
      case "heading":
        return Typography.heading;
      case "subheading":
        return Typography.subheading;
      case "body":
        return Typography.body;
      case "caption":
        return Typography.caption;
      case "small":
        return Typography.small;
      case "link":
        return Typography.body;
      default:
        return Typography.body;
    }
  };

  return (
    <Text style={[{ color: getColor() }, getTypeStyle(), style]} {...rest} />
  );
}
