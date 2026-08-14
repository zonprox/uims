import { api } from './api';

export const authService = {
  login: async (credentials: any) => {
    // Mock login for now
    if (credentials.email && credentials.password) {
      return {
        data: {
          token: 'mock-jwt-token',
          user: { id: '1', email: credentials.email, name: 'Admin User', role: 'admin' },
        },
      };
    }
    throw new Error('Invalid credentials');
  },
  logout: async () => {
    // await api.post('/auth/logout');
  },
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};
