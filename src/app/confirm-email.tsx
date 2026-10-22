import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorLine, Field, TextButton } from '@/components/ui';
import { Colors, Font, Spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { realEmail, useSession } from '@/lib/session';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Every account needs at least one confirmed email (Dan). Shown after signing in when the
 * account has none (phone, username or social sign-up) or hasn't confirmed it yet.
 *
 * No email (or only the @no-email.invalid stand-in): POST /me/emails {email} sends a code,
 * /me/emails/confirm {email, code} adds it as the confirmed primary.
 * Unconfirmed: POST /me/email-verification sends a code, /confirm {code} confirms it.
 */
export default function ConfirmEmail() {
  const { user, token, refreshUser, signOut } = useSession();
  const existing = realEmail(user);
  const hasEmail = !!existing;
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(existing);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // An existing, unconfirmed address: send its code once on arrival.
  useEffect(() => {
    if (hasEmail) {
      apiFetch('/me/email-verification', { method: 'POST', token }).catch(() => {});
    }
  }, [hasEmail, token]);

  async function sendCode() {
    const value = email.trim();
    if (!EMAIL_SHAPE.test(value)) return setError('Enter a valid email address.');
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/me/emails', { method: 'POST', body: { email: value }, token });
      setSentTo(value);
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy(false);
  }

  async function resend() {
    setError(null);
    try {
      if (hasEmail) await apiFetch('/me/email-verification', { method: 'POST', token });
      else await apiFetch('/me/emails', { method: 'POST', body: { email: sentTo }, token });
      setNotice('We sent a new code.');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function confirm() {
    const clean = code.replace(/[\s-]/g, '');
    if (!/^\d{4,10}$/.test(clean)) return setError('Enter the code from the email, digits only.');
    setBusy(true);
    setError(null);
    try {
      if (hasEmail) {
        await apiFetch('/me/email-verification/confirm', { method: 'POST', body: { code: clean }, token });
      } else {
        await apiFetch('/me/emails/confirm', { method: 'POST', body: { email: sentTo, code: clean }, token });
      }
      // needsEmail turns false and the route guard opens the app.
      await refreshUser();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">
          {sentTo ? 'Confirm your email' : 'Add your email'}
        </Text>
        <Text style={styles.lede}>
          {sentTo
            ? `We emailed a code to ${sentTo}. Enter it to finish setting up your account.`
            : 'Every LightPainters account needs an email, so we can reach you about your account.'}
        </Text>

        {sentTo ? (
          <>
            <Field
              label="Code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={12}
              autoFocus
              onSubmitEditing={confirm}
            />
            <ErrorLine error={error} />
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            <Button label="Confirm" onPress={confirm} busy={busy} disabled={code.trim() === ''} />
            <TextButton label="Send a new code" onPress={resend} disabled={busy} />
            {!hasEmail ? (
              <TextButton
                label="Use a different email"
                onPress={() => {
                  setSentTo(null);
                  setCode('');
                }}
              />
            ) : null}
          </>
        ) : (
          <>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              onSubmitEditing={sendCode}
            />
            <ErrorLine error={error} />
            <Button label="Send code" onPress={sendCode} busy={busy} disabled={email.trim() === ''} />
          </>
        )}
        <TextButton label="Log out" onPress={signOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background },
  body: { padding: Spacing.xl, gap: Spacing.lg, width: '100%', maxWidth: 460, alignSelf: 'center', paddingTop: 60 },
  title: { color: Colors.foreground, fontSize: Font.xl, fontWeight: '800', textAlign: 'center' },
  lede: { color: Colors.muted, fontSize: Font.sm, textAlign: 'center', lineHeight: 20 },
  notice: { color: Colors.success, fontSize: Font.sm, textAlign: 'center' },
});
