import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'lightpainters.apiToken';

// SecureStore has no web implementation, so the web build falls back to localStorage.
export async function getToken() {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(KEY);
}

export async function setToken(token: string) {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(KEY, token);
    } catch {}
    return;
  }
  await SecureStore.setItemAsync(KEY, token);
}

export async function clearToken() {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
