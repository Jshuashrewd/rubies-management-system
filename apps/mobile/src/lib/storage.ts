// Secure token/credential storage (native). Uses expo-secure-store.
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "rubies.token";
const SCHOOL_ID_KEY = "rubies.schoolId";

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function saveSchoolId(id: string): Promise<void> {
  await SecureStore.setItemAsync(SCHOOL_ID_KEY, id);
}

export async function getSchoolId(): Promise<string | null> {
  return SecureStore.getItemAsync(SCHOOL_ID_KEY);
}
