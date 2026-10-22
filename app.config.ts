import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json, plus the Google and Facebook sign-in plugins — added only when their ids are
 * set, because both plugins refuse to build without them. Without them the buttons still
 * show and explain that this build can't sign in with that provider.
 *
 * Set on the EAS environment (and in .env.local to prebuild locally):
 *   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID  the web client id (the server's GOOGLE_CLIENT_ID)
 *   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID  the iOS OAuth client, …apps.googleusercontent.com
 *   EXPO_PUBLIC_FACEBOOK_APP_ID       the server's FACEBOOK_CLIENT_ID
 *   FACEBOOK_CLIENT_TOKEN             Facebook app → Settings → Advanced → Client token
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins: ExpoConfig['plugins'] = [...(config.plugins ?? [])];

  const googleIos = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (googleIos) {
    const iosUrlScheme = `com.googleusercontent.apps.${googleIos.replace('.apps.googleusercontent.com', '')}`;
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme }]);
  }

  const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
  const facebookClientToken = process.env.FACEBOOK_CLIENT_TOKEN;
  if (facebookAppId && facebookClientToken) {
    plugins.push([
      'react-native-fbsdk-next',
      { appID: facebookAppId, clientToken: facebookClientToken, displayName: 'LightPainters', scheme: `fb${facebookAppId}` },
    ]);
  }

  return { ...config, name: config.name ?? 'LightPainters', slug: config.slug ?? 'lightpainters', plugins };
};
