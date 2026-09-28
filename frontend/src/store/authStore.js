import { create } from 'zustand';
import api from '../lib/api';

const isMasterSuperAdmin = (u) => {
  if (!u) return false;
  return u.role === 'super_admin' || (u.role === 'admin' && !u.ward_area);
};

export const useAuthStore = create((set, get) => ({
  user: null,
  role: null,
  isLoggedIn: false,
  isLoading: false,
  hasCheckedAuth: false,
  selectedBranch: null, // null means "All Wards (Global Master)" for super admin

  setUser: (user) => {
    const isSuperAdmin = isMasterSuperAdmin(user);
    const initialBranch = isSuperAdmin ? null : (user?.branch || (user?.ward_area ? { id: user.ward_area, name: user.ward_area } : null));

    set({
      user,
      role: isSuperAdmin ? 'super_admin' : (user?.role === 'admin' ? 'branch_admin' : user?.role),
      isLoggedIn: !!user,
      isLoading: false,
      hasCheckedAuth: true,
      selectedBranch: initialBranch,
    });
  },

  setSelectedBranch: (branch) => {
    const state = get();
    // Non-super-admins cannot switch away from their assigned ward
    if (!isMasterSuperAdmin(state.user)) {
      return;
    }
    set({ selectedBranch: branch });
    if (typeof window !== 'undefined') {
      if (branch) {
        localStorage.setItem('gospeedy_selected_branch', JSON.stringify(branch));
      } else {
        localStorage.removeItem('gospeedy_selected_branch');
      }
      // Dispatch custom event for dashboard/components to reactively reload
      window.dispatchEvent(new CustomEvent('branchChange', { detail: branch }));
    }
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get(`/api/auth/me?t=${Date.now()}`);
      if (res.data?.success && res.data?.data?.user) {
        const user = res.data.data.user;
        const isSuperAdmin = isMasterSuperAdmin(user);
        
        let storedBranch = null;
        if (typeof window !== 'undefined' && isSuperAdmin) {
          try {
            const raw = localStorage.getItem('gospeedy_selected_branch');
            if (raw) storedBranch = JSON.parse(raw);
          } catch (e) {
            storedBranch = null;
          }
        }

        const activeBranch = isSuperAdmin 
          ? storedBranch 
          : (user.branch || (user.ward_area ? { id: user.ward_area, name: user.ward_area } : null));

        const effectiveRole = isSuperAdmin ? 'super_admin' : (user.role === 'admin' ? 'branch_admin' : user.role);

        set({
          user: { ...user, role: effectiveRole },
          role: effectiveRole,
          selectedBranch: activeBranch,
          isLoggedIn: true,
          isLoading: false,
          hasCheckedAuth: true,
        });
        return user;
      }
    } catch {
      set({
        user: null,
        role: null,
        selectedBranch: null,
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
        const isSuperAdmin = isMasterSuperAdmin(user);
        
        let storedBranch = null;
        if (typeof window !== 'undefined' && isSuperAdmin) {
          try {
            const raw = localStorage.getItem('gospeedy_selected_branch');
            if (raw) storedBranch = JSON.parse(raw);
          } catch (e) {
            storedBranch = null;
          }
        }

        const activeBranch = isSuperAdmin 
          ? storedBranch 
          : (user.branch || (user.ward_area ? { id: user.ward_area, name: user.ward_area } : null));

        const effectiveRole = isSuperAdmin ? 'super_admin' : (user.role === 'admin' ? 'branch_admin' : user.role);

        set({
          user: { ...user, role: effectiveRole },
          role: effectiveRole,
          selectedBranch: activeBranch,
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
      if (typeof window !== 'undefined') {
        localStorage.removeItem('gospeedy_selected_branch');
      }
      set({
        user: null,
        role: null,
        selectedBranch: null,
        isLoggedIn: false,
        isLoading: false,
      });
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  },
}));
