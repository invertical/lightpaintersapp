/**
 * The v2 API, at /v2 on the website's own host (Dan: no api. subdomain). In dev that is
 * the root Laravel checkout on Dan's machine, whose APP_URL is its LAN address, so the
 * web build and phones on the Wi-Fi use the same URL. EXPO_PUBLIC_API_URL in .env.local
 * overrides it.
 */
const DEV_API_URL = 'http://10.0.0.210:8180/v2';
const PROD_API_URL = 'https://www.lightpainters.com/v2';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? DEV_API_URL : PROD_API_URL);

/** The website, for pages the app hands to the browser (org dashboards). */
export const SITE_URL = 'https://www.lightpainters.com';
