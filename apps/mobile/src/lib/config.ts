// Backend base URL. Set EXPO_PUBLIC_API_URL in apps/mobile/.env (no trailing /api).
//
// A phone can't reach your laptop through "localhost" — that means the phone
// itself. Use the laptop's LAN address instead, e.g.
//   EXPO_PUBLIC_API_URL=http://192.168.1.148:3001
// (phone and laptop must be on the same Wi-Fi, and the laptop's firewall must
// allow port 3001). Restart `expo start` after changing it.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";
