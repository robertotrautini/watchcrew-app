import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TextInput } from "react-native";

import { Button } from "@/components/ui/Button";
import { requestPasswordReset } from "@/lib/auth";
import { screenKeyboardAvoidingBehavior } from "@/lib/platformKeyboardAvoiding";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Always shown after a submit, whatever the API answered: avoids revealing
// whether an account exists for the address (no account enumeration).
const NEUTRAL_SUCCESS_MESSAGE = "Wenn die Adresse existiert, haben wir eine E-Mail gesendet.";

/**
 * "Passwort vergessen?" (ADR 0004: Supabase's built-in recovery mail). The
 * mail link opens the app at src/app/auth/callback.tsx.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setValidationError("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }
    setValidationError(null);
    setLoading(true);
    // The result's error is deliberately ignored in the UI (neutral message).
    const { error } = await requestPasswordReset(trimmed);
    if (error) {
      console.warn("requestPasswordReset failed", error.message);
    }
    setLoading(false);
    setSent(true);
  }

  function goToLogin() {
    router.replace("/(auth)/login");
  }

  return (
    <KeyboardAvoidingView
      behavior={screenKeyboardAvoidingBehavior(Platform.OS)}
      className="flex-1 justify-center gap-4 px-6"
      testID="forgot-password-screen">
      <Text className="mb-2 font-display text-3xl text-text-primary">Passwort vergessen?</Text>

      {sent ? (
        <>
          <Text testID="forgot-password-success" className="text-base text-text-secondary">
            {NEUTRAL_SUCCESS_MESSAGE}
          </Text>
          <Button
            variant="secondary"
            label="Zurück zum Login"
            onPress={goToLogin}
            testID="forgot-password-back-button"
          />
        </>
      ) : (
        <>
          <Text className="text-base text-text-secondary">
            Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link zum Zurücksetzen.
          </Text>
          <TextInput
            testID="forgot-password-email-input"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="du@beispiel.de"
            placeholderTextColor="#888888"
            className="rounded-lg border border-border-subtle bg-card px-4 py-3 text-text-primary"
          />
          {validationError ? (
            <Text testID="forgot-password-validation-error" className="text-sm text-danger">
              {validationError}
            </Text>
          ) : null}
          <Button
            label="Link senden"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            testID="forgot-password-submit-button"
          />
          <Button
            variant="secondary"
            label="Zurück zum Login"
            onPress={goToLogin}
            testID="forgot-password-back-button"
          />
        </>
      )}
    </KeyboardAvoidingView>
  );
}
