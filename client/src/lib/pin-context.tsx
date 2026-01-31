import { createContext, useContext, useState, useCallback } from "react";
import type { PinSession } from "@shared/schema";

type SimpleBillCreator = { id: string; name: string; active?: boolean };

type PinContextType = {
  session: PinSession | null;
  isAuthenticated: boolean;
  authenticate: (billCreator: SimpleBillCreator) => void;
  logout: () => void;
  billCreatorName: string | null;
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

  const authenticate = useCallback((billCreator: SimpleBillCreator) => {
    const newSession: PinSession = {
      billCreatorId: billCreator.id,
      billCreatorName: billCreator.name,
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
  const billCreatorName = session?.billCreatorName || null;

  return (
    <PinContext.Provider value={{ session, isAuthenticated, authenticate, logout, billCreatorName }}>
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
