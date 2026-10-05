import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
} from "react-native";
import { Link, useRouter } from "expo-router";

import { Button } from "@/components/ui/Button";
import { Brand } from "@/components/ui/Brand";
import { Glass, GLASS_INPUT_CLASSNAME } from "@/components/ui/Glass";
import { signInWithEmail } from "@/lib/auth";
import { screenKeyboardAvoidingBehavior } from "@/lib/platformKeyboardAvoiding";

// Basic (not RFC-perfect) email shape check — good enough to catch obvious
// typos ("foo", "foo@") before spending a network round-trip, without
// pretending to fully validate deliverability.
const EMAIL_SHAPE_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Real M3 Login screen content. Client-side validation only checks
 * non-empty password + plausible email shape before calling
 * `signInWithEmail` (src/lib/auth.ts, M1) — it does not attempt to
 * pre-verify credentials.
 *
 * On success, this explicitly calls `router.replace("/")` rather than
 * relying purely on the root `useAuthGate`/`index.tsx` redirect
 * (src/hooks/useAuthGate.ts) to react to the Supabase auth-state-change on
 * its own. `useAuthGate`'s `onAuthStateChange` subscription only lives on
 * `index.tsx`, which unmounts (and unsubscribes) the moment its own
 * `<Redirect>` first sends the user to `/login` -- so by the time a
 * `SIGNED_IN` event fires here, nobody is listening for it anymore. Same
 * gap M9's Group-Settings screen and M10's Settings sign-out handler
 * already hit and worked around with the identical explicit
 * `router.replace("/")` call — see those files' own comments.
 */
export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setApiError(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !EMAIL_SHAPE_REGEX.test(trimmedEmail)) {
      setValidationError("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }

    if (!password) {
      setValidationError("Bitte gib dein Passwort ein.");
      return;
    }

    setValidationError(null);
    setLoading(true);

    const { error } = await signInWithEmail(trimmedEmail, password);

    setLoading(false);

    if (error) {
      setApiError(error.message);
      return;
    }

    router.replace("/");
  }

  return (
    // M11 (platform-quirk review, see docs/interim-decisions.md "M11 —
    // Keyboard-Avoiding"): this screen has no ScrollView and is vertically
    // centered (`justify-center`) with the submit button directly below the
    // two text inputs -- on a short-height device with the keyboard open,
    // the button (and any validation/API error text) could otherwise end
    // up hidden behind the keyboard. `behavior={undefined}` on Android
    // relies on that platform's own default `windowSoftInputMode:
    // "adjustResize"` window behavior (this screen is a plain in-Activity
    // route, not an RN `Modal`, so that default does apply here -- unlike
    // src/components/ui/Sheet.tsx, see that file's own comment).
    <KeyboardAvoidingView
      behavior={screenKeyboardAvoidingBehavior(Platform.OS)}
      className="flex-1 justify-center px-6"
      testID="login-screen"
    >
      <Brand />
      <Glass variant="strong" className="gap-3 p-5">
        <Text className="text-sm text-text-secondary">E-Mail</Text>
        <TextInput
          testID="login-email-input"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholder="du@beispiel.de"
          placeholderTextColor="#888888"
          className={GLASS_INPUT_CLASSNAME}
        />

        <Text className="text-sm text-text-secondary">Passwort</Text>
        <TextInput
          testID="login-password-input"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="••••••••"
          placeholderTextColor="#888888"
          className={GLASS_INPUT_CLASSNAME}
        />

        {validationError ? (
          <Text testID="login-validation-error" className="text-sm text-danger">
            {validationError}
          </Text>
        ) : null}

        {apiError ? (
          <Text testID="login-api-error" className="text-sm text-danger">
            {`Anmeldung fehlgeschlagen: ${apiError}`}
          </Text>
        ) : null}

        <Button
          label="Anmelden"
          icon="login"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          testID="login-submit-button"
        />

        <Link href="/(auth)/forgot-password" asChild>
          <Pressable
            testID="login-forgot-password-link"
            accessibilityRole="link"
            className="min-h-touch-comfortable items-center justify-center"
          >
            <Text
              testID="login-forgot-password-link-text"
              className="text-center text-base text-accent-light"
            >
              Passwort vergessen?
            </Text>
          </Pressable>
        </Link>

        <Link href="/(auth)/register" asChild>
          <Pressable
            testID="login-register-link"
            accessibilityRole="link"
            className="min-h-touch-comfortable items-center justify-center"
          >
            <Text
              testID="login-register-link-text"
              className="text-center text-base text-accent-light"
            >
              Noch kein Konto? Jetzt registrieren
            </Text>
          </Pressable>
        </Link>
      </Glass>
    </KeyboardAvoidingView>
  );
}
