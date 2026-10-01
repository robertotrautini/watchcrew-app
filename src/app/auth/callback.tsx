import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Text, TextInput } from "react-native";

import { Button } from "@/components/ui/Button";
import { establishSessionFromTokens, exchangeAuthCode, updatePassword } from "@/lib/auth";
import { parseAuthLink } from "@/lib/authDeepLink";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordRules";
import { screenKeyboardAvoidingBehavior } from "@/lib/platformKeyboardAvoiding";

// How long to wait for the deep-link URL before giving up (e.g. route opened
// without a link).
const URL_WAIT_MS = 4000;

const INVALID_LINK_MESSAGE = "Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.";

type Phase = "processing" | "recovery" | "error";

/**
 * Deep-link target `watchcrew://auth/callback` for Supabase Auth emails
 * (public route: lives outside the (auth)/(app) groups, so no auth gate
 * bounces a signed-in recovery session away before the password is set).
 * Implicit flow (supabase-js default, see src/lib/supabase.ts): the link
 * carries `#access_token=...&refresh_token=...&type=recovery|signup` which
 * detectSessionInUrl (off on RN) would not read, so it is parsed here
 * (src/lib/authDeepLink.ts) and the session is set explicitly.
 *   - type=recovery -> "Neues Passwort setzen" form (updateUser)
 *   - anything else with a session (signup confirmation) -> "/" (root gate)
 *   - error params / invalid tokens -> message + way back to forgot-password
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const url = Linking.useLinkingURL();
  const handledUrlRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<Phase>("processing");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (url) return;
    const timer = setTimeout(() => setPhase("error"), URL_WAIT_MS);
    return () => clearTimeout(timer);
  }, [url]);

  useEffect(() => {
    if (!url || handledUrlRef.current === url) return;
    // Tokens are single-use: never process the same URL twice.
    handledUrlRef.current = url;
    const link = parseAuthLink(url);

    async function run() {
      if (link.error || link.errorCode) {
        setPhase("error");
        return;
      }

      let result: { error: unknown } | null = null;
      if (link.accessToken && link.refreshToken) {
        result = await establishSessionFromTokens(link.accessToken, link.refreshToken);
      } else if (link.code) {
        result = await exchangeAuthCode(link.code);
      }

      if (!result || result.error) {
        setPhase("error");
        return;
      }

      if (link.type === "recovery") {
        setPhase("recovery");
        return;
      }
      router.replace("/");
    }

    void run();
  }, [url, router]);

  async function handleSubmit() {
    setApiError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setValidationError(`Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`);
      return;
    }
    if (password !== confirmPassword) {
      setValidationError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setValidationError(null);
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      setApiError(error.message);
      return;
    }
    // Explicit navigation: no useAuthGate listener is mounted here (see login.tsx).
    router.replace("/");
  }

  if (phase === "processing") {
    return (
      <KeyboardAvoidingView
        className="flex-1 items-center justify-center bg-bg-primary px-6"
        testID="auth-callback-screen">
        <ActivityIndicator testID="auth-callback-loading" />
      </KeyboardAvoidingView>
    );
  }

  if (phase === "error") {
    return (
      <KeyboardAvoidingView
        className="flex-1 items-center justify-center gap-4 bg-bg-primary px-6"
        testID="auth-callback-screen">
        <Text testID="auth-callback-error" className="text-center text-base text-danger">
          {INVALID_LINK_MESSAGE}
        </Text>
        <Button
          label="Neuen Link anfordern"
          onPress={() => router.replace("/(auth)/forgot-password")}
          testID="auth-callback-forgot-password-button"
        />
        <Button
          variant="secondary"
          label="Zum Login"
          onPress={() => router.replace("/(auth)/login")}
          testID="auth-callback-login-button"
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={screenKeyboardAvoidingBehavior(Platform.OS)}
      className="flex-1 justify-center gap-4 bg-bg-primary px-6"
      testID="auth-callback-screen">
      <Text className="mb-2 font-display text-3xl text-text-primary">Neues Passwort setzen</Text>
      <TextInput
        testID="auth-callback-password-input"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholder={`Mindestens ${MIN_PASSWORD_LENGTH} Zeichen`}
        placeholderTextColor="#888888"
        className="rounded-lg border border-border-subtle bg-card px-4 py-3 text-text-primary"
      />
      <TextInput
        testID="auth-callback-confirm-input"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholder="Passwort wiederholen"
        placeholderTextColor="#888888"
        className="rounded-lg border border-border-subtle bg-card px-4 py-3 text-text-primary"
      />
      {validationError ? (
        <Text testID="auth-callback-validation-error" className="text-sm text-danger">
          {validationError}
        </Text>
      ) : null}
      {apiError ? (
        <Text testID="auth-callback-api-error" className="text-sm text-danger">
          {`Passwort konnte nicht geändert werden: ${apiError}`}
        </Text>
      ) : null}
      <Button
        label="Passwort speichern"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        testID="auth-callback-submit-button"
      />
    </KeyboardAvoidingView>
  );
}
