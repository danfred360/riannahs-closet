import React, { ReactNode } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";

interface ContentContainerProps {
  children: ReactNode;
  maxWidth?: number;
  style?: object;
}

export function ContentContainer({ children, maxWidth = 500, style }: ContentContainerProps) {
  const { width } = useWindowDimensions();
  const isWide = width > maxWidth;

  return (
    <View style={[styles.container, isWide && { maxWidth, alignSelf: "center", width: "100%" }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
});
