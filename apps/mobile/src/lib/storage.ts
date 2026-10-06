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

// Classes the student has already joined. Persisted so that restarting the
// app doesn't re-book alarms for a class they're already in (see reminders.tsx).
// Capped: SecureStore values are limited to ~2KB, and old classes don't matter.
const JOINED_KEY = "rubies.joinedClassIds";
const MAX_JOINED = 30;

export async function getJoinedClassIds(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(JOINED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export async function markClassJoined(classId: string): Promise<void> {
  const ids = await getJoinedClassIds();
  if (ids.includes(classId)) return;
  await SecureStore.setItemAsync(
    JOINED_KEY,
    JSON.stringify([...ids, classId].slice(-MAX_JOINED)),
  );
}

export async function clearJoinedClassIds(): Promise<void> {
  await SecureStore.deleteItemAsync(JOINED_KEY);
}
