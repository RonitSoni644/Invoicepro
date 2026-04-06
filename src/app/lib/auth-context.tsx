import {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  useRef,
  useState,
} from "react";
import { publishAuthState } from "./auth-state";
import { clearCache, migrateLocalDataToCloud } from "./store";
import { supabase } from "./supabase";

interface AuthContextType {
  user: any | null;
  session: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    name: string,
    phone: string,
  ) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
function getAccountStatus(user: any) {
  const value = user?.app_metadata?.accountStatus ?? user?.user_metadata?.accountStatus;
  return value === "inactive" || value === "suspended" ? value : "active";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildUserMetadata(name: string, phone: string) {
  const normalizedName = name.trim();
  const normalizedPhone = phone.trim();

  return {
    name: normalizedName,
    full_name: normalizedName,
    phone: normalizedPhone,
    phone_number: normalizedPhone,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const lastMigratedUserIdRef = useRef<string | null>(null);
  const forcedSignOutRef = useRef(false);
  const currentSessionRef = useRef<any | null>(null);

  useEffect(() => {
    const scheduleForcedSignOut = () => {
      if (forcedSignOutRef.current) {
        return;
      }

      forcedSignOutRef.current = true;

      window.setTimeout(() => {
        void supabase.auth
          .signOut()
          .catch((error) => {
            console.error("Failed to complete forced sign-out:", error);
          })
          .finally(() => {
            forcedSignOutRef.current = false;
          });
      }, 0);
    };

    const syncSession = async (nextSession: any | null) => {
      const nextUserId = nextSession?.user?.id ?? null;
      const nextStatus = getAccountStatus(nextSession?.user);

      if (nextUserId && nextStatus !== "active") {
        scheduleForcedSignOut();
        clearCache();
        lastMigratedUserIdRef.current = null;
        publishAuthState(null);
        setSession(null);
        setUser(null);
        return;
      }

      if (!nextUserId) {
        clearCache();
        lastMigratedUserIdRef.current = null;
      }

      publishAuthState(nextUserId);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      // if (nextUserId && lastMigratedUserIdRef.current !== nextUserId) {
      //   lastMigratedUserIdRef.current = nextUserId;
      //   void migrateLocalDataToCloud(nextUserId).catch((error) => {
      //     console.error("Background cloud sync failed:", error);
      //   });
      // }
    };

    const handleAuthStateChange = async (event: string, nextSession: any | null) => {
      if (
        event === "INITIAL_SESSION" &&
        !nextSession &&
        currentSessionRef.current
      ) {
        return;
      }

      setLoading(true);

      try {
        await syncSession(nextSession);
        currentSessionRef.current = nextSession;
      } catch (error) {
        console.error("Failed to synchronize auth session:", error);
        clearCache();
        publishAuthState(nextSession?.user?.id ?? null);
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        currentSessionRef.current = nextSession;
      } finally {
        setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      void handleAuthStateChange(event, nextSession);
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          throw error;
        }

        return handleAuthStateChange("INITIAL_SESSION", data.session ?? null);
      })
      .catch((error) => {
        console.error("Failed to read initial auth session:", error);
        clearCache();
        publishAuthState(null);
        setSession(null);
        setUser(null);
        currentSessionRef.current = null;
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      throw error;
    }

    const status = getAccountStatus(data.user);
    if (status !== "active") {
      if (!forcedSignOutRef.current) {
        forcedSignOutRef.current = true;
        window.setTimeout(() => {
          void supabase.auth
            .signOut()
            .catch((signOutError) => {
              console.error("Failed to complete forced sign-out:", signOutError);
            })
            .finally(() => {
              forcedSignOutRef.current = false;
            });
        }, 0);
      }
      throw new Error(
        status === "suspended"
          ? "This account has been suspended. Contact an administrator."
          : "This account is inactive. Contact an administrator.",
      );
    }

    // Update local auth state immediately so protected routes don't bounce
    // back to /login before the auth listener finishes processing.
    publishAuthState(data.user?.id ?? null);
    setSession(data.session ?? null);
    setUser(data.user ?? null);
    currentSessionRef.current = data.session ?? null;
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    phone: string,
  ) => {
    const normalizedEmail = normalizeEmail(email);
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: buildUserMetadata(name, phone),
      },
    });

    if (error) {
      throw error;
    }

    if (data.session) {
      publishAuthState(data.user?.id ?? null);
      setSession(data.session);
      setUser(data.user ?? null);
      currentSessionRef.current = data.session;
      return { requiresEmailConfirmation: false };
    }

    return { requiresEmailConfirmation: true };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    clearCache();
    publishAuthState(null);
    setSession(null);
    setUser(null);
    currentSessionRef.current = null;
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
