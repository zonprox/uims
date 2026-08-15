import { api } from './api';

export interface LoginResponse {
  token: string;
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export const authService = {
  login: async (credentials: {
    email: string;
    password: string;
  }): Promise<{ data: LoginResponse }> => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },
  logout: async () => {
    // Local logout cleanup
  },
  getProfile: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};
