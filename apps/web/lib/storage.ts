// Token storage (web). SPA-style: localStorage, not a secure enclave — see
// SYSTEM_DESIGN.md §16 for the trade-off this makes vs. mobile's SecureStore.
const TOKEN_KEY = "rubies.token";

const hasWindow = () => typeof window !== "undefined";

export function saveToken(token: string): void {
  if (!hasWindow()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (!hasWindow()) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  if (!hasWindow()) return;
  window.localStorage.removeItem(TOKEN_KEY);
}
