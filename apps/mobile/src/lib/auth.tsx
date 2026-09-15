// Auth context: holds the signed-in user + token, bootstraps from secure storage.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@rubies/shared";
import { api } from "./api";
import { clearToken, getToken, saveToken } from "./storage";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  signIn: (schoolId: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const me = await api.me();
          if (active) setUser(me);
        }
      } catch {
        await clearToken();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function signIn(schoolId: string, password: string): Promise<User> {
    const res = await api.auth.login({ schoolId, password });
    await saveToken(res.token);
    setUser(res.user);
    return res.user;
  }

  async function signOut(): Promise<void> {
    await clearToken();
    setUser(null);
  }

  async function refresh(): Promise<void> {
    setUser(await api.me());
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
