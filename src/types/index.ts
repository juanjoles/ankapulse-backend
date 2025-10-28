export interface CustomError extends Error {
  statusCode?: number;
}

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data?: T;
  statusCode?: number;
  errors?: string[];
}

export interface User {
  id: string;
  auth0Id?: string;
  provider?: string;
  nombre: string;
  email: string;
  password?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  emailVerified: boolean;
}

export interface UserPublic {
  id: string;
  nombre: string;
  email: string;
  avatar?: string;
  provider?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  emailVerified: boolean;
}

export interface CreateUserRequest {
  nombre: string;
  email: string;
  password: string;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserPublic;
}

// Tipos específicos de Auth0
export interface Auth0Profile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}

export interface Auth0LoginResponse {
  user: UserPublic;
  token: string;
  isNewUser: boolean;
  provider: string;
}

// Tipos específicos de Checks
import { Check } from '@prisma/client';

export interface CreateCheckRequest {
  url: string;
  name?: string;
  interval: string;
  regions: string[];
  timeout?: number;
  expectedStatusCode?: number;
}

export interface CheckResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    check: Check;
  };
  errors?: string[];
}