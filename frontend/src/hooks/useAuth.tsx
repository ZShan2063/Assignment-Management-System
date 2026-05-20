import { useContext, createContext, useState, useEffect } from "react";
import { User } from "../types";
import { apiCall } from "../services/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, expectedRole?: User["role"]) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const stored = localStorage.getItem("authUser");

    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("authUser");
      }
    }

    setLoading(false);
  }, []);

  const login = async (username: string, password: string, expectedRole?: User["role"]) => {
    const response = await apiCall("/users/login/", "POST", {
      username,
      password,
      role: expectedRole,
    });
    if (expectedRole && response.user.role !== expectedRole) {
      throw new Error(`This account is not registered as a ${expectedRole}.`);
    }
    localStorage.setItem("authToken", response.token);
    localStorage.setItem("authUser", JSON.stringify(response.user));
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    localStorage.setItem("authUser", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
