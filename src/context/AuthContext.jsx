import { createContext, useContext, useState, useEffect } from "react";
import { loginAdmin, logoutUser } from "../api/auth";
import { getErrorMessage } from "../utils/getErrorMessage";

const AuthContext = createContext(null);

/**
 * Decodes JWT payload and checks if the token has expired
 */
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return false; // no exp claim, assume valid
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true; // if we can't decode it, treat as invalid
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize auth state from localStorage on application mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("accessToken");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        if (isTokenExpired(storedToken)) {
          logoutUser();
        } else {
          setAccessToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      }
    } catch (err) {
      console.error("Failed to parse stored user from localStorage", err);
      logoutUser();
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Performs super admin login
   * @param {string} phone
   * @param {string} password
   */
  const login = async (phone, password) => {
    setAuthError(null);
    try {
      const data = await loginAdmin({ phone, password });

      const token = data.accessToken || data.token;
      const refreshToken = data.refreshToken;
      const userData = data.user;

      if (!token) {
        throw new Error("No access token received from server.");
      }

      // Store tokens and user object in localStorage
      localStorage.setItem("accessToken", token);
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }
      localStorage.setItem("user", JSON.stringify(userData));

      // Update context state
      setAccessToken(token);
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const errorMessage = getErrorMessage(
        err,
        "Login failed. Please check your credentials and try again.",
      );
      setAuthError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Logs out user and clears local auth tokens
   */
  const logout = () => {
    logoutUser();
    setUser(null);
    setAccessToken(null);
    setAuthError(null);
  };

  /**
   * Updates user object in context state and localStorage
   */
  const updateUser = (updatedUserData) => {
    setUser((prev) => {
      const nextUser =
        typeof updatedUserData === "function"
          ? updatedUserData(prev)
          : { ...prev, ...updatedUserData };
      localStorage.setItem("user", JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const value = {
    user,
    accessToken,
    isAuthenticated: !!accessToken,
    isLoading,
    authError,
    setAuthError,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to consume AuthContext safely
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
