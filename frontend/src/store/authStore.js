import { create } from 'zustand';
import api from '../lib/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  role: null,
  isLoggedIn: false,
  isLoading: false,
  hasCheckedAuth: false,

  setUser: (user) => {
    set({
      user,
      role: user?.role || null,
      isLoggedIn: !!user,
      isLoading: false,
      hasCheckedAuth: true,
    });
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get(`/api/auth/me?t=${Date.now()}`);
      if (res.data?.success && res.data?.data?.user) {
        set({
          user: res.data.data.user,
          role: res.data.data.user.role,
          isLoggedIn: true,
          isLoading: false,
          hasCheckedAuth: true,
        });
        return res.data.data.user;
      }
    } catch {
      set({
        user: null,
        role: null,
        isLoggedIn: false,
        isLoading: false,
        hasCheckedAuth: true,
      });
    }
    return null;
  },

  login: async (identifier, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/api/auth/login', { email: identifier, password });
      if (res.data?.success) {
        const user = res.data.data.user;
        set({
          user,
          role: user.role,
          isLoggedIn: true,
          isLoading: false,
        });
        return { success: true, user };
      }
      throw new Error(res.data?.message || 'Login failed');
    } catch (error) {
      set({ isLoading: false });
      let message = error.response?.data?.message || error.message || 'Login failed';
      
      // If there are detailed validation errors, show the first one
      if (error.response?.data?.errors?.length > 0) {
        message = error.response.data.errors[0].message;
      }
      
      return { success: false, error: message };
    }
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      set({
        user: null,
        role: null,
        isLoggedIn: false,
        isLoading: false,
      });
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  },
}));
