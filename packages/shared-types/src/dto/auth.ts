import type { AppUser } from '../entities/user';

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface LoginResponse {
  user: AppUser;
  accessToken: string;
  refreshToken: string;
  permissions?: string[];
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  permissions?: string[];
  exp: number;
  iat: number;
}
