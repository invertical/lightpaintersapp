import * as AppleAuthentication from 'expo-apple-authentication';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

export type Provider = 'apple' | 'google' | 'facebook';

export const PROVIDERS: { id: Provider; name: string }[] = [
  { id: 'apple', name: 'Apple' },
  { id: 'google', name: 'Google' },
  { id: 'facebook', name: 'Facebook' },
];

/** What POST /auth/oauth takes: the SDK's token, checked by the server, never trusted here. */
export type ProviderCredential = {
  provider: Provider;
  idToken: string;
  nonce?: string;
  firstName?: string | null;
  lastName?: string | null;
};

/** This build or device can't sign in with the provider. The message is for people. */
export class ProviderUnavailable extends Error {}

/** The person closed the provider's sheet. Not an error worth showing. */
export class ProviderCancelled extends Error {}

const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Sign in with the provider's native SDK and hand back its token for POST /auth/oauth.
 *
 * None of the three runs in the iPhone's Expo Go on SDK 57 (the `eas go` build has no
 * Apple module either), so each needs a real build of the app: Apple with the bundle id
 * in the server's APPLE_APP_CLIENT_IDS, Google and Facebook with their ids set — see
 * app.config.ts. Their modules are required lazily: in Expo
 * Go, importing them at the top would crash the sign-in screen.
 */
export async function providerCredential(provider: Provider): Promise<ProviderCredential> {
  const name = PROVIDERS.find((p) => p.id === provider)!.name;
  if (Platform.OS === 'web') {
    throw new ProviderUnavailable(`Sign in with ${name} works in the LightPainters app on your phone.`);
  }
  switch (provider) {
    case 'apple':
      return apple();
    case 'google':
      return google(name);
    case 'facebook':
      return facebook(name);
  }
}

async function apple(): Promise<ProviderCredential> {
  if (Platform.OS !== 'ios') {
    throw new ProviderUnavailable('Sign in with Apple works on iPhone and iPad.');
  }
  // False when the native module isn't in the running app: the SDK 57 Expo Go that
  // `eas go` builds for iPhone leaves it out, so Apple needs a real build of the app too.
  if (!(await AppleAuthentication.isAvailableAsync())) {
    throw new ProviderUnavailable("Sign in with Apple isn't in this build of the app yet.");
  }
  const nonce = Crypto.randomUUID();
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce,
    });
    if (!credential.identityToken) {
      throw new Error('Apple sent no identity token.');
    }
    // Apple sends the name on the first authorisation only, and never in the token.
    return {
      provider: 'apple',
      idToken: credential.identityToken,
      nonce,
      firstName: credential.fullName?.givenName,
      lastName: credential.fullName?.familyName,
    };
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new ProviderCancelled();
    throw e;
  }
}

function nativeModule<T>(load: () => T, name: string): T {
  if (inExpoGo) {
    throw new ProviderUnavailable(`Sign in with ${name} needs the LightPainters app. It can't run in Expo Go.`);
  }
  try {
    return load();
  } catch {
    throw new ProviderUnavailable(`Sign in with ${name} isn't in this build of the app yet.`);
  }
}

async function google(name: string): Promise<ProviderCredential> {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!webClientId || (Platform.OS === 'ios' && !iosClientId)) {
    throw new ProviderUnavailable(`Sign in with ${name} isn't set up in this build of the app yet.`);
  }
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = nativeModule(
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy: Expo Go has no such native module
    () => require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin'),
    name
  );

  // webClientId makes the ID token's audience the web client, which the server accepts.
  GoogleSignin.configure({ webClientId, iosClientId });
  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new ProviderCancelled();
    const { idToken, user } = response.data;
    if (!idToken) throw new Error('Google sent no ID token.');
    return { provider: 'google', idToken, firstName: user.givenName, lastName: user.familyName };
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) throw new ProviderCancelled();
    if (isErrorWithCode(e) && e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new ProviderUnavailable('Sign in with Google needs Google Play services on this phone.');
    }
    throw e;
  } finally {
    // The app keeps its own session; forget Google's so the next sign-in asks which account.
    GoogleSignin.signOut().catch(() => {});
  }
}

async function facebook(name: string): Promise<ProviderCredential> {
  if (!process.env.EXPO_PUBLIC_FACEBOOK_APP_ID) {
    throw new ProviderUnavailable(`Sign in with ${name} isn't set up in this build of the app yet.`);
  }
  const { LoginManager, AccessToken, AuthenticationToken, Settings } = nativeModule(
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy: Expo Go has no such native module
    () => require('react-native-fbsdk-next') as typeof import('react-native-fbsdk-next'),
    name
  );

  Settings.initializeSDK();
  const nonce = Crypto.randomUUID();
  try {
    // iOS: Limited Login, a JWT the server checks against Facebook's keys. Android: a
    // classic access token, which the server checks with Graph.
    const result = await LoginManager.logInWithPermissions(['public_profile', 'email'], 'limited', nonce);
    if (result.isCancelled) throw new ProviderCancelled();
    if (Platform.OS === 'ios') {
      const token = await AuthenticationToken.getAuthenticationTokenIOS();
      if (!token) throw new Error('Facebook sent no token.');
      return { provider: 'facebook', idToken: token.authenticationToken, nonce };
    }
    const token = await AccessToken.getCurrentAccessToken();
    if (!token) throw new Error('Facebook sent no token.');
    return { provider: 'facebook', idToken: token.accessToken };
  } finally {
    LoginManager.logOut();
  }
}
