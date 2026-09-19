import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { Button } from "@/components/ui/Button";
import { signUpWithEmail } from "@/lib/auth";

/**
 * Source: supabase/config.toml `auth.minimum_password_length = 6` (the
 * Supabase default, explicitly configured — not guessed). Kept as a local
 * constant rather than imported from anywhere, since there is no runtime
 * config module exposing Supabase Auth's own settings to the client.
 */
const MIN_PASSWORD_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INPUT_CLASSNAME =
  "rounded-lg border border-border-subtle bg-card px-3 py-3 text-base text-text-primary";

function validate(email: string, password: string, confirmPassword: string): string | null {
  if (!EMAIL_PATTERN.test(email.trim())) {
    return "Bitte gib eine gültige E-Mail-Adresse ein.";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`;
  }
  if (password !== confirmPassword) {
    return "Die Passwörter stimmen nicht überein.";
  }
  return null;
}

/**
 * Real M3 Register screen content (per ADR 0004). Email confirmation before
 * first login is ON, so a successful sign-up does NOT log the user in or
 * navigate anywhere — it replaces the form with a "check your email"
 * confirmation state instead. Error handling: the Supabase error's own
 * `message` is shown as-is (including the "user already registered" case)
 * — supabase-js already returns a single human-readable string there, so no
 * extra shape-specific handling is needed.
 */
export default function RegisterScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  function goToLogin() {
    router.push("/(auth)/login");
  }

  async function handleSubmit() {
    setSubmitError(null);

    const error = validate(email, password, confirmPassword);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);

    setLoading(true);
    const { error: signUpError } = await signUpWithEmail(email.trim(), password);
    setLoading(false);

    if (signUpError) {
      setSubmitError(signUpError.message);
      return;
    }
    setRegistered(true);
  }

  if (registered) {
    return (
      <View
        className="flex-1 items-center justify-center gap-4 bg-bg-primary px-6"
        testID="register-screen">
        <Text
          className="text-center font-display text-2xl text-text-primary"
          testID="register-success-heading">
          Bestätige deine E-Mail
        </Text>
        <Text className="text-center text-base text-text-secondary">
          Wir haben dir eine Bestätigungs-E-Mail an {email.trim()} geschickt. Bitte bestätige
          deine E-Mail-Adresse, um dein Konto zu aktivieren und dich anzumelden.
        </Text>
        <Button
          variant="primary"
          label="Zurück zum Login"
          onPress={goToLogin}
          testID="register-back-to-login-button"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center gap-4 bg-bg-primary px-6" testID="register-screen">
      <Text className="mb-2 font-display text-3xl text-text-primary">Registrieren</Text>

      <View className="gap-1">
        <Text className="text-sm text-text-secondary">E-Mail</Text>
        <TextInput
          testID="register-email-input"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="deine@email.de"
          placeholderTextColor="#888888"
          className={INPUT_CLASSNAME}
        />
      </View>

      <View className="gap-1">
        <Text className="text-sm text-text-secondary">Passwort</Text>
        <TextInput
          testID="register-password-input"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={`Mindestens ${MIN_PASSWORD_LENGTH} Zeichen`}
          placeholderTextColor="#888888"
          className={INPUT_CLASSNAME}
        />
      </View>

      <View className="gap-1">
        <Text className="text-sm text-text-secondary">Passwort bestätigen</Text>
        <TextInput
          testID="register-confirm-password-input"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="Passwort wiederholen"
          placeholderTextColor="#888888"
          className={INPUT_CLASSNAME}
        />
      </View>

      {validationError ? (
        <Text className="text-sm text-danger" testID="register-validation-error">
          {validationError}
        </Text>
      ) : null}

      {submitError ? (
        <Text className="text-sm text-danger" testID="register-submit-error">
          {submitError}
        </Text>
      ) : null}

      <Button
        variant="primary"
        label="Konto erstellen"
        onPress={handleSubmit}
        loading={loading}
        testID="register-submit-button"
      />

      <Button
        variant="secondary"
        label="Bereits ein Konto? Zum Login"
        onPress={goToLogin}
        testID="register-login-link"
      />
    </View>
  );
}
