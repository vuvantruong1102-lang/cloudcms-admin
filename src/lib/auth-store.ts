import { create } from 'zustand';
import { api, setToken } from './api';

export type User = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
};

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  async login(email, password) {
    const resp = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    setToken(resp.token);
    set({ user: resp.user });
  },
  logout() {
    setToken(null);
    set({ user: null });
  },
  async fetchMe() {
    set({ loading: true });
    try {
      const user = await api.get<User>('/auth/me');
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
}));
