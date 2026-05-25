import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fetchUser = async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data);
      setIsLoggedIn(true);
      return response.data;
    } catch (error) {
      localStorage.removeItem("access_token");
      setUser(null);
      setIsLoggedIn(false);
      throw error;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          await fetchUser();
        } catch (e) {
          console.error("Token startup check failed:", e);
        }
      }
      setLoading(false);
    };

    initializeAuth();

    const handleForceLogout = () => {
      setUser(null);
      setIsLoggedIn(false);
    };
    window.addEventListener("auth_logout", handleForceLogout);

    return () => {
      window.removeEventListener("auth_logout", handleForceLogout);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      const { access_token, user: userData } = response.data;
      localStorage.setItem("access_token", access_token);
      setUser(userData);
      setIsLoggedIn(true);
      return response.data;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post("/auth/register", userData);
      const { access_token, user: newUser } = response.data;
      localStorage.setItem("access_token", access_token);
      setUser(newUser);
      setIsLoggedIn(true);
      return response.data;
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Backend logout error:", error);
    } finally {
      localStorage.removeItem("access_token");
      setUser(null);
      setIsLoggedIn(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn,
        loading,
        login,
        register,
        logout,
        refreshUser: fetchUser,
        isAuthModalOpen,
        setIsAuthModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
