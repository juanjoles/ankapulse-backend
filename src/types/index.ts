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
  nombre: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  emailVerified: boolean;
}

export interface UserPublic {
  id: string;
  nombre: string;
  email: string;
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

import { Check } from '@prisma/client';

// Usamos el tipo Check de @prisma/client en lugar de definir uno propio

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