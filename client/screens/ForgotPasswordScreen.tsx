import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

type RootStackParamList = {
  Auth: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
};

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const response = await fetch(new URL("/api/v1/auth/forgot-password", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (response.status === 429) {
        setError("Too many requests. Please wait a few minutes and try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        setError(data.error || "Failed to send reset email");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigation.navigate("ResetPassword", { email: email.trim() });
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + Spacing["3xl"], paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.logoContainer, { backgroundColor: theme.primary }]}>
          <Feather name="key" size={36} color="white" />
        </View>
        <ThemedText type="title" style={styles.title}>
          Reset Password
        </ThemedText>
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          {success
            ? "Check your email for a reset code"
            : "Enter your email to receive a reset code"}
        </ThemedText>
      </View>

      <View style={styles.form}>
        {success ? (
          <>
            <View style={[styles.successBox, { backgroundColor: theme.primary + "15" }]}>
              <ThemedText type="body" style={{ color: theme.primary, textAlign: "center" }}>
                If an account exists with that email, you'll receive a 6-digit reset code shortly.
              </ThemedText>
            </View>

            <Button onPress={handleContinue}>
              <ThemedText style={{ color: theme.buttonText, fontWeight: "600" }}>
                Enter Reset Code
              </ThemedText>
            </Button>
          </>
        ) : (
          <>
            <View style={styles.field}>
              <ThemedText type="caption" style={styles.label}>
                Email
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundSecondary,
                    fontFamily: Typography.body.fontFamily,
                  },
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email address"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                testID="input-email"
              />
            </View>

            {error ? (
              <ThemedText type="small" style={[styles.error, { color: theme.error }]}>
                {error}
              </ThemedText>
            ) : null}

            <Button onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={theme.buttonText} />
              ) : (
                <ThemedText style={{ color: theme.buttonText, fontWeight: "600" }}>
                  Send Reset Code
                </ThemedText>
              )}
            </Button>
          </>
        )}

        <Button
          variant="secondary"
          onPress={() => navigation.goBack()}
        >
          <ThemedText style={{ color: theme.text, fontWeight: "600" }}>
            Back to Sign In
          </ThemedText>
        </Button>
      </View>

      <View style={styles.footer}>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
  form: {
    gap: Spacing.lg,
  },
  field: {
    gap: Spacing.sm,
  },
  label: {
    fontWeight: "600",
  },
  input: {
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    fontSize: 16,
  },
  error: {
    textAlign: "center",
    marginTop: -Spacing.sm,
  },
  successBox: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  footer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingTop: Spacing["2xl"],
  },
  dividerLine: {
    width: 100,
    height: 2,
    borderRadius: 1,
    opacity: 0.5,
  },
});
