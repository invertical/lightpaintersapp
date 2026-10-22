import { Platform } from 'react-native';

/**
 * The v2 API, at /v2 on the website's own host (Dan: no api. subdomain). The web build on
 * the dev box resolves *.localhost itself; a phone can't, so it uses the dev box's LAN IP
 * (which the API must accept as a host). EXPO_PUBLIC_API_URL in .env.local overrides both.
 */
const DEV_API_URL = Platform.OS === 'web' ? 'http://www.lightpainters.localhost:8181/v2' : 'http://10.0.0.210:8181/v2';
const PROD_API_URL = 'https://www.lightpainters.com/v2';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? DEV_API_URL : PROD_API_URL);

/** The website, for pages the app hands to the browser (org dashboards). */
export const SITE_URL = 'https://www.lightpainters.com';
