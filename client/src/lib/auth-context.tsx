import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiRequest } from "./queryClient";

type AuthUser = {
  id: string;
  username: string;
  role: string;
  email?: string;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_STORAGE_KEY = "travelbill_auth";
const TOKEN_STORAGE_KEY = "travelbill_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      
      try {
        const res = await fetch("/api/auth/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${storedToken}`,
          },
          body: JSON.stringify({ token: storedToken }),
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.valid && data.user) {
            setUser({ 
              id: data.user.id, 
              username: data.user.username,
              role: data.user.role || "staff"
            });
            setToken(storedToken);
          } else {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          }
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
      setIsLoading(false);
    };
    
    validateSession();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      if (!res.ok) {
        return false;
      }
      const data = await res.json();
      if (data.success && data.user && data.token) {
        const authUser: AuthUser = {
          id: data.user.id,
          username: data.user.username,
          role: data.user.role || "staff",
        };
        setUser(authUser);
        setToken(data.token);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${storedToken}`,
          },
        });
      } catch {
        // Ignore errors
      }
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
