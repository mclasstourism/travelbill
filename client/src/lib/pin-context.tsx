import { createContext, useContext, useState, useCallback } from "react";
import type { User } from "@shared/schema";

type PinSession = {
  staffId: string;
  staffName: string;
  authenticated: boolean;
  expiresAt: number;
};

type PinContextType = {
  session: PinSession | null;
  isAuthenticated: boolean;
  authenticate: (staff: User) => void;
  logout: () => void;
  staffName: string | null;
};

const PinContext = createContext<PinContextType | undefined>(undefined);

const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

export function PinProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<PinSession | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("pinSession");
      if (stored) {
        const parsed = JSON.parse(stored) as PinSession;
        if (parsed.expiresAt > Date.now()) {
          return parsed;
        }
        localStorage.removeItem("pinSession");
      }
    }
    return null;
  });

  const authenticate = useCallback((staff: User) => {
    const newSession: PinSession = {
      staffId: staff.id,
      staffName: staff.name || staff.username,
      authenticated: true,
      expiresAt: Date.now() + SESSION_DURATION,
    };
    setSession(newSession);
    localStorage.setItem("pinSession", JSON.stringify(newSession));
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    localStorage.removeItem("pinSession");
  }, []);

  const isAuthenticated = session !== null && session.expiresAt > Date.now();
  const staffName = session?.staffName || null;

  return (
    <PinContext.Provider value={{ session, isAuthenticated, authenticate, logout, staffName }}>
      {children}
    </PinContext.Provider>
  );
}

export function usePin() {
  const context = useContext(PinContext);
  if (!context) {
    throw new Error("usePin must be used within a PinProvider");
  }
  return context;
}
