// Single shared API client instance for the trainer web app.
import { createApiClient } from "@rubies/shared";
import { API_BASE_URL } from "./config";
import { clearToken, getToken } from "./storage";

// The client is a plain module-level singleton (outside React), so a 401
// notifies whoever is currently listening — normally AuthProvider — rather
// than reaching into React state directly. See lib/auth.tsx.
type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;

export function onApiUnauthorized(listener: UnauthorizedListener | null): void {
  unauthorizedListener = listener;
}

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => getToken(),
  onUnauthorized: () => {
    // Token rejected — drop it and let the app react (redirect to login).
    clearToken();
    unauthorizedListener?.();
  },
});
