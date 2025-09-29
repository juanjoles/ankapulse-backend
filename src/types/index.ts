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
  auth0Id?: string;        // NUEVO
  provider?: string;       // NUEVO
  nombre: string;
  email: string;
  password?: string;       // MODIFICADO - opcional para social login
  avatar?: string;         // NUEVO
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  emailVerified: boolean;
}

export interface UserPublic {
  id: string;
  nombre: string;
  email: string;
  avatar?: string;         // NUEVO
  provider?: string;       // NUEVO
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

// Tipos específicos de Auth0 (NUEVOS)
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