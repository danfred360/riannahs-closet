import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

type AuthStackParamList = {
  Auth: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "Auth">;

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { login, register } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password.trim()) {
      setError("Please enter a password");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = isLogin
        ? await login(email.trim(), password)
        : await register(email.trim(), password, displayName.trim() || undefined);

      if (!result.success) {
        setError(result.error || "Something went wrong");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setConfirmPassword("");
    setDisplayName("");
    Haptics.selectionAsync();
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
          source={require("../../assets/images/app-icon.png")}
          style={styles.logo}
          contentFit="contain"
        />
        <ThemedText type="title" style={styles.title}>
          Riannah's Closet
        </ThemedText>
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          Your personal wardrobe companion
        </ThemedText>
      </View>

      <View style={styles.form}>
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
            placeholder="Enter your email"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            testID="input-email"
          />
        </View>

        {!isLogin ? (
          <View style={styles.field}>
            <ThemedText type="caption" style={styles.label}>
              Display Name (optional)
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
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="How should we call you?"
              placeholderTextColor={theme.textSecondary}
              autoCorrect={false}
              testID="input-display-name"
            />
          </View>
        ) : null}

        <View style={styles.field}>
          <ThemedText type="caption" style={styles.label}>
            Password
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
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            testID="input-password"
          />
        </View>

        {!isLogin ? (
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
              placeholder="Confirm your password"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              testID="input-confirm-password"
            />
          </View>
        ) : null}

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
              {isLogin ? "Sign In" : "Create Account"}
            </ThemedText>
          )}
        </Button>

        <Pressable onPress={toggleMode} style={styles.toggleButton}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
              {isLogin ? "Sign Up" : "Sign In"}
            </ThemedText>
          </ThemedText>
        </Pressable>

        {isLogin ? (
          <Pressable
            onPress={() => navigation.navigate("ForgotPassword")}
            style={styles.forgotButton}
          >
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Forgot your password?
            </ThemedText>
          </Pressable>
        ) : null}
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
  logo: {
    width: 100,
    height: 100,
    marginBottom: Spacing.lg,
    borderRadius: 20,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
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
  toggleButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  forgotButton: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
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
