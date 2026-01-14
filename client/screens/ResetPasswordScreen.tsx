import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
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

type Props = NativeStackScreenProps<RootStackParamList, "ResetPassword">;

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { email } = route.params;

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (!code.trim() || code.length !== 6) {
      setError("Please enter the 6-digit code from your email");
      return;
    }

    if (!newPassword.trim() || newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const response = await fetch(new URL("/api/v1/auth/reset-password", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code.trim(), newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (response.status === 429) {
        setError("Too many attempts. Please wait and try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        setError(data.error || "Failed to reset password");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate("Auth");
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
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
          contentFit="contain"
        />
        <ThemedText type="title" style={styles.title}>
          {success ? "Password Reset" : "Create New Password"}
        </ThemedText>
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          {success
            ? "Your password has been updated successfully"
            : `Enter the code sent to ${email}`}
        </ThemedText>
      </View>

      <View style={styles.form}>
        {success ? (
          <>
            <View style={[styles.successBox, { backgroundColor: theme.primary + "15" }]}>
              <ThemedText type="body" style={{ color: theme.primary, textAlign: "center" }}>
                You can now sign in with your new password.
              </ThemedText>
            </View>

            <Button onPress={handleBackToLogin}>
              <ThemedText style={{ color: theme.buttonText, fontWeight: "600" }}>
                Back to Sign In
              </ThemedText>
            </Button>
          </>
        ) : (
          <>
            <View style={styles.field}>
              <ThemedText type="caption" style={styles.label}>
                Reset Code
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  styles.codeInput,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundSecondary,
                    fontFamily: Typography.body.fontFamily,
                  },
                ]}
                value={code}
                onChangeText={(text) => setCode(text.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
                testID="input-code"
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="caption" style={styles.label}>
                New Password
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
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                testID="input-new-password"
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="caption" style={styles.label}>
                Confirm Password
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
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                testID="input-confirm-password"
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
                  Reset Password
                </ThemedText>
              )}
            </Button>

            <Button
              variant="secondary"
              onPress={() => navigation.goBack()}
            >
              <ThemedText style={{ color: theme.text, fontWeight: "600" }}>
                Back
              </ThemedText>
            </Button>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Image
          source={require("../assets/images/botanical-divider.png")}
          style={styles.divider}
          contentFit="contain"
        />
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
  logo: {
    width: 80,
    height: 80,
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
  codeInput: {
    textAlign: "center",
    fontSize: 24,
    letterSpacing: 8,
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
  divider: {
    width: 150,
    height: 40,
    opacity: 0.5,
  },
});
