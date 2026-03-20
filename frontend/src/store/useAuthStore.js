import { create } from 'zustand';
import api from '../utils/api';
import { initSocket, disconnectSocket } from '../utils/socket';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  isLoading: false,
  error: null,

  /**
   * Register a new user
   */
  register: async (username, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/register', { username, email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      initSocket(data.token);
      set({ user: data.user, token: data.token, isLoading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      set({ error: msg, isLoading: false });
      return { success: false, message: msg };
    }
  },

  /**
   * Login existing user
   */
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      initSocket(data.token);
      set({ user: data.user, token: data.token, isLoading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      set({ error: msg, isLoading: false });
      return { success: false, message: msg };
    }
  },

  /**
   * Logout current user
   */
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {}
    disconnectSocket();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  /**
   * Update user in store (e.g. after profile edit)
   */
  updateUser: (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
