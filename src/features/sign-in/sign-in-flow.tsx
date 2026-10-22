import { Image } from 'expo-image';
import { ChevronLeft } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, ErrorLine, Field, IconButton, TextButton } from '@/components/ui';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';
import { ApiError, errorMessage } from '@/lib/api';
import { useSession, type SignInPath, type SignInStep } from '@/lib/session';
import { PROVIDERS, ProviderCancelled, ProviderUnavailable, providerCredential, type Provider } from '@/lib/sign-in-providers';
import { useApi } from '@/lib/use-api';

/** The server's own test for "this is a phone number" (SignInFlow::start). */
const PHONE_SHAPE = /^[+\d(][\d\s().-]{6,}$/;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_HINT = 'Enter a mobile number, like 303 555 0142. Outside North America, start with + and the country code.';

/** The identifier must be an email, a phone number or a username. The server decides the rest. */
function identifierProblem(raw: string): string | null {
  const value = raw.trim();
  if (value === '') return 'Enter your email, phone number or username.';
  if (value.includes('@')) {
    return EMAIL_SHAPE.test(value) && value.length <= 254 ? null : 'Enter a valid email address.';
  }
  if (PHONE_SHAPE.test(value)) {
    const digits = value.replace(/\D/g, '');
    const ok = value.startsWith('+')
      ? digits.length >= 8 && digits.length <= 15
      : digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
    return ok ? null : PHONE_HINT;
  }
  // 45 is the Logins.Username column width.
  return value.length <= 45 ? null : "That's too long for a username. Check it, or use your email.";
}

/** Codes are digits; people paste them with spaces or dashes. */
const cleanCode = (raw: string) => raw.replace(/[\s-]/g, '');
const codeProblem = (code: string) => (/^\d{4,10}$/.test(code) ? null : 'Enter the code from the message, digits only.');

type Stage = { step: 'identify' } | SignInStep;
type Busy = SignInPath | Provider | null;

/**
 * The website's step-by-step sign-in (POST /auth/*, copied from the Multipass app): one
 * field for an email, a phone number or a username, then whatever that needs. Google,
 * Apple and Facebook sit below it, those the server accepts (GET /auth/providers).
 *
 *   identify → password | email-code | sms-code → (choose-account) → (sign-up)
 *
 * Every rule is the server's; this only holds the step on screen and its single-use token.
 * "Create account" is the same flow: someone new lands on the sign-up step, which asks for
 * an email whenever the server doesn't have one (every account needs one).
 */
export function SignInFlow({ mode, onExit }: { mode: 'log-in' | 'create'; onExit: () => void }) {
  const { advanceSignIn } = useSession();
  const [stage, setStage] = useState<Stage>({ step: 'identify' });
  const [identifier, setIdentifier] = useState('');
  const [via, setVia] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);

  function startOver(message: string | null = null) {
    setStage({ step: 'identify' });
    setVia(null);
    setError(message);
  }

  async function advance(path: SignInPath, body: Record<string, unknown>, label: Busy = path) {
    setBusy(label);
    setError(null);
    try {
      const next = await advanceSignIn(path, body);
      // Signed in: the route guard swaps in the app and this screen unmounts.
      if (!next) return;
      setStage(next);
    } catch (e) {
      if (e instanceof ApiError && e.status === 422 && e.code === 'sign_in_expired') {
        startOver(e.message);
      } else {
        const retry = e instanceof ApiError ? e.problem.token : undefined;
        if (typeof retry === 'string' && stage.step !== 'identify') {
          setStage({ ...stage, token: retry } as Stage);
        }
        setError(errorMessage(e));
      }
    }
    setBusy(null);
  }

  async function withProvider(provider: Provider) {
    setBusy(provider);
    setError(null);
    const name = PROVIDERS.find((p) => p.id === provider)!.name;
    let credential;
    try {
      credential = await providerCredential(provider);
    } catch (e) {
      setBusy(null);
      if (e instanceof ProviderCancelled) return;
      setError(e instanceof ProviderUnavailable ? e.message : `Could not sign you in with ${name}. Try again.`);
      return;
    }
    setVia(`Continuing with ${name}`);
    await advance('oauth', credential, provider);
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.chrome}>
        <IconButton icon={ChevronLeft} label="Back" onPress={stage.step === 'identify' ? onExit : () => startOver()} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" />
        {stage.step === 'identify' ? (
          <IdentifyStep
            mode={mode}
            identifier={identifier}
            onChange={setIdentifier}
            error={error}
            busy={busy}
            onContinue={() => {
              const problem = identifierProblem(identifier);
              if (problem) return setError(problem);
              setVia(null);
              advance('start', { identifier: identifier.trim() });
            }}
            onProvider={withProvider}
          />
        ) : (
          <>
            <StepHeading stage={stage} />
            <View style={styles.who}>
              <Text style={styles.whoText} numberOfLines={1}>
                {via ?? identifier.trim()}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => startOver()} hitSlop={8}>
                <Text style={styles.whoLink}>Use a different one</Text>
              </Pressable>
            </View>
            <CurrentStep stage={stage} error={error} setError={setError} busy={busy} advance={advance} startOver={startOver} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function IdentifyStep({
  mode,
  identifier,
  onChange,
  error,
  busy,
  onContinue,
  onProvider,
}: {
  mode: 'log-in' | 'create';
  identifier: string;
  onChange: (value: string) => void;
  error: string | null;
  busy: Busy;
  onContinue: () => void;
  onProvider: (provider: Provider) => void;
}) {
  const create = mode === 'create';
  // Only the providers this server accepts (GET /auth/providers); none while it has no client ids.
  const accepted = useApi<{ data: Provider[] }>('/auth/providers');
  const providers = PROVIDERS.filter((p) => accepted.data?.data.includes(p.id));
  return (
    <>
      <Title
        title={create ? 'Create your account' : 'Log in'}
        lede={
          create
            ? 'Start with your email, mobile number or the username you want. We will ask for anything else we need.'
            : 'Use your email, mobile number or username.'
        }
      />
      <Field
        label={create ? 'Email, mobile number or username' : 'Email, phone number or username'}
        value={identifier}
        onChangeText={onChange}
        placeholder="you@example.com or 303 555 0142"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        returnKeyType="go"
        onSubmitEditing={onContinue}
        editable={busy === null}
        error={error}
      />
      <Button label="Continue" onPress={onContinue} disabled={identifier.trim() === '' || busy !== null} busy={busy === 'start'} />

      {providers.length > 0 ? (
        <>
          <View style={styles.or}>
            <View style={styles.rule} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.rule} />
          </View>
          <View style={styles.providers}>
            {providers.map((p) => (
              <Button
                key={p.id}
                variant="secondary"
                label={busy === p.id ? 'One moment…' : `Continue with ${p.name}`}
                onPress={() => onProvider(p.id)}
                disabled={busy !== null}
              />
            ))}
          </View>
        </>
      ) : null}
    </>
  );
}

function Title({ title, lede }: { title: string; lede?: string }) {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {lede ? <Text style={styles.lede}>{lede}</Text> : null}
    </View>
  );
}

function StepHeading({ stage }: { stage: SignInStep }) {
  switch (stage.step) {
    case 'password':
      return <Title title="Enter your password" />;
    case 'email-code':
      return <Title title="Check your email" lede={`We emailed a code to ${stage.email ?? 'your email'}.`} />;
    case 'sms-code':
      return (
        <Title
          title="Check your messages"
          lede={`We texted a code to your phone ending ${(stage.phone ?? '').split('•').pop() || 'in the number you entered'}.`}
        />
      );
    case 'choose-account':
      return (
        <Title
          title="Which account is yours?"
          lede="This phone number is on more than one account. Pick yours and we'll email a code to confirm."
        />
      );
    case 'sign-up':
      return <Title title="Create your account" lede="You're new here. Tell us who you are." />;
    case 'email-taken':
      return (
        <Title
          title="That email has an account"
          lede={`${stage.email ?? 'That email'} already belongs to an account. Log in to it instead.`}
        />
      );
  }
}

type StepProps = {
  stage: SignInStep;
  error: string | null;
  setError: (message: string | null) => void;
  busy: Busy;
  advance: (path: SignInPath, body: Record<string, unknown>) => Promise<void>;
  startOver: (message?: string | null) => void;
};

function CurrentStep(props: StepProps) {
  // Keyed on the step, so each one starts with empty fields.
  switch (props.stage.step) {
    case 'password':
      return <PasswordStep key="password" {...props} stage={props.stage} />;
    case 'email-code':
    case 'sms-code':
      return <CodeStep key={props.stage.step} {...props} stage={props.stage} />;
    case 'choose-account':
      return <ChooseStep {...props} stage={props.stage} />;
    case 'sign-up':
      return <SignUpStep {...props} stage={props.stage} />;
    case 'email-taken':
      return <Button label="Log in" onPress={() => props.startOver()} />;
  }
}

function PasswordStep({ stage, error, setError, busy, advance }: StepProps & { stage: Extract<SignInStep, { step: 'password' }> }) {
  const [password, setPassword] = useState('');
  const submit = () => {
    if (password === '') return setError('Enter your password.');
    setPassword('');
    advance('password', { token: stage.token, password });
  };

  return (
    <>
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoFocus
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        editable={busy === null}
        error={error}
      />
      <Button label="Log in" onPress={submit} disabled={password === '' || busy !== null} busy={busy === 'password'} />
      {stage.emailCodeOffered ? (
        <TextButton
          label="Email me a code instead"
          disabled={busy !== null}
          onPress={() => advance('email-code-instead', { token: stage.token })}
        />
      ) : null}
    </>
  );
}

function CodeStep({ stage, error, setError, busy, advance }: StepProps & { stage: Extract<SignInStep, { step: 'email-code' | 'sms-code' }> }) {
  const [code, setCode] = useState('');
  const path = stage.step;
  const submit = () => {
    const clean = cleanCode(code);
    const problem = codeProblem(clean);
    if (problem) return setError(problem);
    setCode('');
    advance(path, { token: stage.token, code: clean });
  };

  return (
    <>
      <Field
        label="Code"
        value={code}
        onChangeText={setCode}
        autoFocus
        maxLength={12}
        autoComplete={path === 'sms-code' ? 'sms-otp' : 'one-time-code'}
        textContentType="oneTimeCode"
        keyboardType="number-pad"
        returnKeyType="go"
        onSubmitEditing={submit}
        editable={busy === null}
        error={error}
      />
      <Button label="Continue" onPress={submit} disabled={code.trim() === '' || busy !== null} busy={busy === path} />
      {stage.step === 'email-code' && stage.notMeOffered ? (
        <TextButton
          label="That's not me, or I can't get into that email"
          disabled={busy !== null}
          onPress={() => advance('not-me', { token: stage.token })}
        />
      ) : null}
    </>
  );
}

function ChooseStep({ stage, error, busy, advance }: StepProps & { stage: Extract<SignInStep, { step: 'choose-account' }> }) {
  return (
    <>
      {stage.options.map((option) => (
        <Pressable
          key={option.option}
          accessibilityRole="button"
          disabled={busy !== null}
          onPress={() => advance('choose', { token: stage.token, option: option.option })}
          style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
          <Text style={styles.optionEmail} numberOfLines={1}>
            {option.email}
          </Text>
          <Text style={styles.optionMeta}>
            {option.name}
            {option.since ? ` · since ${option.since}` : ''}
          </Text>
        </Pressable>
      ))}
      <ErrorLine error={error} />
      {stage.notMeOffered ? (
        <TextButton label="None of these are me" disabled={busy !== null} onPress={() => advance('not-me', { token: stage.token })} />
      ) : null}
    </>
  );
}

function SignUpStep({ stage, error, setError, busy, advance }: StepProps & { stage: Extract<SignInStep, { step: 'sign-up' }> }) {
  const lastRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const [firstName, setFirstName] = useState(stage.firstName ?? '');
  const [lastName, setLastName] = useState(stage.lastName ?? '');
  const [email, setEmail] = useState(stage.suggestedEmail ?? '');

  const submit = () => {
    const first = firstName.trim();
    const last = lastName.trim();
    if (first === '' || last === '') return setError('Enter your first and last name.');
    if (first.length > 45 || last.length > 45) return setError('Names can be up to 45 characters.');
    if (!stage.emailKnown && !EMAIL_SHAPE.test(email.trim())) return setError('Enter a valid email address.');
    advance('sign-up', {
      token: stage.token,
      firstName: first,
      lastName: last,
      ...(stage.emailKnown ? {} : { email: email.trim() }),
    });
  };

  return (
    <>
      <View style={styles.row}>
        <View style={styles.half}>
          <Field
            label="First name"
            value={firstName}
            onChangeText={setFirstName}
            autoFocus={!firstName}
            autoComplete="given-name"
            textContentType="givenName"
            maxLength={45}
            returnKeyType="next"
            onSubmitEditing={() => lastRef.current?.focus()}
            editable={busy === null}
          />
        </View>
        <View style={styles.half}>
          <Field
            ref={lastRef}
            label="Last name"
            value={lastName}
            onChangeText={setLastName}
            autoComplete="family-name"
            textContentType="familyName"
            maxLength={45}
            returnKeyType={stage.emailKnown ? 'go' : 'next'}
            onSubmitEditing={() => (stage.emailKnown ? submit() : emailRef.current?.focus())}
            editable={busy === null}
          />
        </View>
      </View>
      {stage.emailKnown ? (
        <Text style={styles.note}>{`Your email: ${stage.email ?? ''}`}</Text>
      ) : (
        // Every account needs at least one valid email (Dan).
        <Field
          ref={emailRef}
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          maxLength={254}
          returnKeyType="go"
          onSubmitEditing={submit}
          editable={busy === null}
          hint="Every account needs an email. We'll send a code to confirm it."
        />
      )}
      <ErrorLine error={error} />
      <Button label="Create account" onPress={submit} disabled={busy !== null} busy={busy === 'sign-up'} />
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  chrome: { paddingHorizontal: Spacing.sm, paddingTop: Spacing.xs, alignItems: 'flex-start' },
  body: { padding: Spacing.xl, paddingTop: Spacing.sm, gap: Spacing.lg, width: '100%', maxWidth: 460, alignSelf: 'center' },
  logo: { width: 60, height: 72, alignSelf: 'center' },
  titleBlock: { gap: Spacing.sm, alignItems: 'center' },
  title: { color: Colors.foreground, fontSize: Font.xl, fontWeight: '800', textAlign: 'center' },
  lede: { color: Colors.muted, fontSize: Font.sm, textAlign: 'center', lineHeight: 20 },
  who: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  whoText: { flexShrink: 1, color: Colors.muted, fontSize: Font.sm },
  whoLink: { color: Colors.gold, fontSize: Font.sm, fontWeight: '600' },
  or: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  orText: { color: Colors.muted, fontSize: Font.tiny },
  providers: { gap: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.md },
  half: { flex: 1 },
  note: { color: Colors.muted, fontSize: Font.sm },
  option: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: Spacing.md,
    gap: 3,
  },
  optionPressed: { opacity: 0.7 },
  optionEmail: { color: Colors.foreground, fontSize: Font.base },
  optionMeta: { color: Colors.muted, fontSize: Font.tiny },
});
