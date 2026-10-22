import * as Device from 'expo-device';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { ApiError, apiFetch, setUnauthorizedHandler } from '@/lib/api';
import { clearToken, getToken, setToken } from '@/lib/token-storage';
import type { User } from '@/lib/types';

type TokenResponse = {
  token: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: User;
};

/** The step-by-step sign-in's endpoints (POST /auth/<path>), the website's flow. */
export type SignInPath =
  | 'start'
  | 'password'
  | 'email-code-instead'
  | 'email-code'
  | 'sms-code'
  | 'choose'
  | 'not-me'
  | 'sign-up'
  | 'oauth';

/**
 * Where a sign-in stands: the screen to show next. `token` is the opaque, single-use
 * challenge (15 minutes) to send back with the next call. Emails and phones are masked.
 */
export type SignInStep =
  | { step: 'password'; token: string; emailCodeOffered: boolean; email?: string | null }
  | { step: 'email-code'; token: string; email: string | null; notMeOffered: boolean }
  | { step: 'sms-code'; token: string; phone: string | null }
  | {
      step: 'choose-account';
      token: string;
      options: { option: number; email: string; name: string; since: string | null }[];
      notMeOffered?: boolean;
    }
  | {
      step: 'sign-up';
      token: string;
      emailKnown: boolean;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
      suggestedEmail: string | null;
    }
  | { step: 'email-taken'; token: null; email: string | null };

type SignedIn = TokenResponse & { step: 'signed-in'; created?: boolean; needsEmail?: boolean };

type SessionContextValue = {
  token: string | null;
  /** Null while signed out, or if /me could not be reached at startup. */
  user: User | null;
  isLoading: boolean;
  /**
   * Every account needs at least one confirmed email (Dan). True when the signed-in
   * account has none, or hasn't confirmed it: the app shows the email step until it has.
   */
  needsEmail: boolean;
  /**
   * One call of the step-by-step sign-in: the next step, or null once signed in. A refusal
   * throws a 422 ApiError whose `code` is `sign_in_<reason>`, with `problem.token` when the
   * same step can be tried again.
   */
  advanceSignIn: (path: SignInPath, body: Record<string, unknown>) => Promise<SignInStep | null>;
  signOut: () => Promise<void>;
  /** Re-read the signed-in user (GET /me) after a change to it. */
  refreshUser: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const value = use(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return value;
}

/** The signed-in user, for screens that only render while signed in. */
export function useUser() {
  return useSession().user;
}

function deviceName() {
  return Device.deviceName ?? Device.modelName ?? `LightPainters ${Platform.OS}`;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await getToken().catch(() => null);
      if (stored) {
        setTokenState(stored);
        try {
          const me = await apiFetch<{ data: User }>('/me', { token: stored });
          setUser(me.data);
        } catch (error) {
          // A 401 means the token expired or was revoked; there is no refresh endpoint.
          // Any other failure (offline) keeps the token so the person stays signed in.
          if (error instanceof ApiError && error.status === 401) {
            await clearToken();
            setTokenState(null);
          }
        }
      }
      setIsLoading(false);
    })();
  }, []);

  // A token refused mid-session: forget it locally (the server already has).
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken().catch(() => {});
      setTokenState(null);
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const adopt = useCallback(async (result: TokenResponse) => {
    await setToken(result.token);
    setUser(result.user);
    setTokenState(result.token);
  }, []);

  const advanceSignIn = useCallback(
    async (path: SignInPath, body: Record<string, unknown>) => {
      const result = await apiFetch<SignInStep | SignedIn>(`/auth/${path}`, {
        method: 'POST',
        body: { ...body, deviceName: deviceName() },
      });
      if (result.step === 'signed-in') {
        await adopt(result);
        return null;
      }
      return result;
    },
    [adopt]
  );

  const signOut = useCallback(async () => {
    const current = token;
    await clearToken();
    setTokenState(null);
    setUser(null);
    // Revoke on the server too, but don't block signing out locally if it fails.
    if (current) {
      apiFetch('/tokens/current', { method: 'DELETE', token: current }).catch(() => {});
    }
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const me = await apiFetch<{ data: User }>('/me', { token });
    setUser(me.data);
  }, [token]);

  // Unknown (offline at startup) counts as fine: the gate shows once /me answers.
  const needsEmail = !!user && (user.needsEmail ?? (!user.email || !user.emailVerified));

  const value = useMemo(
    () => ({ token, user, isLoading, needsEmail, advanceSignIn, signOut, refreshUser }),
    [token, user, isLoading, needsEmail, advanceSignIn, signOut, refreshUser]
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}
