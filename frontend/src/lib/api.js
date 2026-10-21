import axios from 'axios';

if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  const noop = () => {};
  const methods = ['log', 'debug', 'info', 'warn', 'error', 'table', 'trace', 'dir', 'dirxml', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'timeLog', 'count', 'countReset', 'assert', 'clear'];
  methods.forEach((m) => {
    try {
      Object.defineProperty(window.console, m, {
        get: () => noop,
        set: () => {},
        configurable: true,
        enumerable: true,
      });
    } catch (e) {
      try { window.console[m] = noop; } catch (e2) {}
    }
  });
}

const api = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

api.interceptors.request.use((config) => {
  if (config.method && config.method.toLowerCase() === 'patch') {
    config.method = 'put';
    config.headers['X-HTTP-Method-Override'] = 'PATCH';
  }

  if (typeof window !== 'undefined') {
    try {
      const rawBranch = localStorage.getItem('gospeedy_selected_branch');
      if (rawBranch) {
        const parsed = JSON.parse(rawBranch);
        if (parsed?.id) {
          config.headers['x-branch-id'] = parsed.id;
        }
      }
    } catch (e) {
    }

    try {
      const token = localStorage.getItem('gospeedy_token');
      if (token && !config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
    }
  }

  return config;
});

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      if (originalRequest?.url?.includes('/api/auth/login') || originalRequest?.url?.includes('/api/auth/refresh')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/api/auth/refresh');
        isRefreshing = false;
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login') && window.location.pathname !== '/') {
          window.location.href = '/';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
