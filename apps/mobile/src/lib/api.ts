// Single shared API client instance for the student app.
import { createApiClient } from "@rubies/shared";
import { API_BASE_URL } from "./config";
import { clearToken, getToken } from "./storage";

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => getToken(),
  onUnauthorized: () => {
    // Token rejected — drop it. Navigation reacts via the auth context.
    void clearToken();
  },
});
