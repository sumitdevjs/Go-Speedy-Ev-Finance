import { create } from 'zustand';
import api from '../lib/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  role: null,
  isLoggedIn: false,
  isLoading: false,

  setUser: (user) => {
    set({
      user,
      role: user?.role || null,
      isLoggedIn: !!user,
      isLoading: false,
    });
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get('/api/auth/me');
      if (res.data?.success && res.data?.data?.user) {
        set({
          user: res.data.data.user,
          role: res.data.data.user.role,
          isLoggedIn: true,
          isLoading: false,
        });
        return res.data.data.user;
      }
    } catch {
      set({
        user: null,
        role: null,
        isLoggedIn: false,
        isLoading: false,
      });
    }
    return null;
  },

  login: async (identifier, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/api/auth/login', { identifier, password });
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
      const message = error.response?.data?.message || error.message || 'Login failed';
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
        window.location.href = '/login';
      }
    }
  },
}));
