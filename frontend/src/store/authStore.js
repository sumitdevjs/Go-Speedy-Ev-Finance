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
  selectedBranch: null,       // null = "All" for super_admin / ho_admin
  selectedHeadOffice: null,   // For super_admin: which HO zone they are viewing

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
      selectedHeadOffice: null,
    });
  },

  setSelectedBranch: (branch) => {
    const state = get();
    // Super admins and HO admins can switch branches
    const canSwitch = isMasterSuperAdmin(state.user) || state.user?.role === 'ho_admin';
    if (!canSwitch) return;

    set({ selectedBranch: branch, selectedHeadOffice: null });
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

  // Super Admin only: switch to an HO-level aggregate view
  setSelectedHeadOffice: (ho) => {
    const state = get();
    if (!isMasterSuperAdmin(state.user)) return;
    // Switching to HO view resets any individual branch selection
    set({ selectedHeadOffice: ho, selectedBranch: null });
    if (typeof window !== 'undefined') {
      if (ho) {
        localStorage.setItem('gospeedy_selected_ho', JSON.stringify(ho));
      } else {
        localStorage.removeItem('gospeedy_selected_ho');
      }
      localStorage.removeItem('gospeedy_selected_branch');
      window.dispatchEvent(new CustomEvent('branchChange', { detail: { headOffice: ho } }));
    }
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get(`/api/auth/me?t=${Date.now()}`);
      if (res.data?.success && res.data?.data?.user) {
        const user = res.data.data.user;
        const isSuperAdmin = isMasterSuperAdmin(user);
        const isHoAdmin = user.role === 'ho_admin';

        let storedBranch = null;
        let storedHo = null;

        if (typeof window !== 'undefined' && (isSuperAdmin || isHoAdmin)) {
          try {
            const raw = localStorage.getItem('gospeedy_selected_branch');
            if (raw) {
              const parsed = JSON.parse(raw);
              // For ho_admin: discard stored branch if it belongs to a different HO
              if (isHoAdmin && parsed?.head_office_id && parsed.head_office_id !== user.head_office_id) {
                localStorage.removeItem('gospeedy_selected_branch');
              } else {
                storedBranch = parsed;
              }
            }
          } catch (e) { storedBranch = null; }

          // Super admin: also restore selected HO zone
          if (isSuperAdmin) {
            try {
              const rawHo = localStorage.getItem('gospeedy_selected_ho');
              if (rawHo) storedHo = JSON.parse(rawHo);
            } catch (e) { storedHo = null; }
          }
        }

        const activeBranch = (isSuperAdmin || isHoAdmin)
          ? storedBranch
          : (user.branch || (user.ward_area ? { id: user.ward_area, name: user.ward_area } : null));

        const effectiveRole = isSuperAdmin ? 'super_admin' : (user.role === 'admin' ? 'branch_admin' : user.role);

        set({
          user: { ...user, role: effectiveRole },
          role: effectiveRole,
          selectedBranch: activeBranch,
          selectedHeadOffice: isSuperAdmin ? storedHo : null,
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
        selectedHeadOffice: null,
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
        const isHoAdmin = user.role === 'ho_admin';

        let storedBranch = null;
        let storedHo = null;

        if (typeof window !== 'undefined' && (isSuperAdmin || isHoAdmin)) {
          try {
            const raw = localStorage.getItem('gospeedy_selected_branch');
            if (raw) {
              const parsed = JSON.parse(raw);
              // For ho_admin: discard stored branch if it belongs to a different HO
              if (isHoAdmin && parsed?.head_office_id && parsed.head_office_id !== user.head_office_id) {
                localStorage.removeItem('gospeedy_selected_branch');
              } else {
                storedBranch = parsed;
              }
            }
          } catch (e) { storedBranch = null; }

          if (isSuperAdmin) {
            try {
              const rawHo = localStorage.getItem('gospeedy_selected_ho');
              if (rawHo) storedHo = JSON.parse(rawHo);
            } catch (e) { storedHo = null; }
          }
        }

        const activeBranch = (isSuperAdmin || isHoAdmin)
          ? storedBranch
          : (user.branch || (user.ward_area ? { id: user.ward_area, name: user.ward_area } : null));

        const effectiveRole = isSuperAdmin ? 'super_admin' : (user.role === 'admin' ? 'branch_admin' : user.role);

        if (typeof window !== 'undefined' && res.data?.data?.token) {
          try {
            localStorage.setItem('gospeedy_token', res.data.data.token);
          } catch (e) {}
        }

        set({
          user: { ...user, role: effectiveRole },
          role: effectiveRole,
          selectedBranch: activeBranch,
          selectedHeadOffice: isSuperAdmin ? storedHo : null,
          isLoggedIn: true,
          isLoading: false,
          hasCheckedAuth: true,
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
      // Clean up session in finally
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('gospeedy_token');
        localStorage.removeItem('gospeedy_selected_branch');
        localStorage.removeItem('gospeedy_selected_ho');
      }
      set({
        user: null,
        role: null,
        selectedBranch: null,
        selectedHeadOffice: null,
        isLoggedIn: false,
        isLoading: false,
      });
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  },
}));


