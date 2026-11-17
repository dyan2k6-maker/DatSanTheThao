import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Khởi tạo phiên đăng nhập khi mở app
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setIsLoading(true);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (e) {
      console.warn('Lỗi khi tải phiên đăng nhập:', e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (identifier, password) => {
    const res = await authService.login(identifier, password);
    if (res.success) {
      setUser(res.user);
    }
    return res;
  };

  const register = async (data) => {
    const res = await authService.register(data);
    if (res.success && res.user.status === 'active') {
      setUser(res.user);
    }
    return res;
  };

  const quickLogin = async (role, userId = null) => {
    setIsLoading(true);
    try {
      const loggedUser = await authService.quickLoginDemo(role, userId);
      setUser(loggedUser);
      return loggedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.log('Lỗi đăng xuất:', e);  
    } finally {
      setUser(null);                   
    }
  };

  const updateProfile = async (updates) => {
    const updated = await authService.updateCurrentUser(updates);
    if (updated) {
      setUser(updated);
    }
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        quickLogin,
        logout,
        updateProfile,
        refreshUser: loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được dùng bên trong AuthProvider');
  }
  return context;
};
