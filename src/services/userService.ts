import prisma from '../models/prisma';
import { PasswordUtils } from '../utils/password';
import { JWTUtils } from '../utils/jwt';

export interface CreateUserInput {
  nombre: string;
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  nombre: string;
  email: string;
  avatar?: string;        // NUEVO - URL de avatar
  provider?: string;      // NUEVO - proveedor de auth
  createdAt: Date;
  isActive: boolean;
  emailVerified: boolean;
}

export class UserService {
  // MANTENER - Método original para registro con email/password
  static async createUser(userData: CreateUserInput): Promise<{ user: UserResponse; token: string }> {
    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    // Hash de la contraseña
    const hashedPassword = await PasswordUtils.hashPassword(userData.password);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        nombre: userData.nombre,
        email: userData.email,
        password: hashedPassword,
        provider: 'email', // NUEVO - marcar como usuario de email
      }
    });

    // Generar token JWT
    const token = JWTUtils.generateToken({
      userId: user.id,
      email: user.email
    });

    // Retornar usuario sin password y token
    const userResponse: UserResponse = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      createdAt: user.createdAt,
      isActive: user.isActive,
      emailVerified: user.emailVerified
    };

    return { user: userResponse, token };
  }

  static async getUserById(id: string): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        email: true,
        createdAt: true,
        isActive: true,
        emailVerified: true
      }
    });

    return user;
  }

  static async getUserByEmail(email: string): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        nombre: true,
        email: true,
        createdAt: true,
        isActive: true,
        emailVerified: true
      }
    });

    return user;
  }

  // NUEVO - Crear/obtener usuario desde Auth0
  static async findOrCreateFromAuth0(auth0Profile: any): Promise<{ user: UserResponse; token: string; isNewUser: boolean }> {
    try {
      // Buscar usuario existente por auth0Id o email
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { auth0Id: auth0Profile.sub },
            { email: auth0Profile.email }
          ]
        }
      });

      let isNewUser = false;

      if (!user) {
        // Crear nuevo usuario desde Auth0
        const provider = this.getProviderFromAuth0Sub(auth0Profile.sub);
        
        user = await prisma.user.create({
          data: {
            auth0Id: auth0Profile.sub,
            provider: provider,
            nombre: auth0Profile.name || auth0Profile.email.split('@')[0],
            email: auth0Profile.email,
            avatar: auth0Profile.picture,
            emailVerified: auth0Profile.email_verified || false,
            password: null, // No password para usuarios sociales
          }
        });
        
        isNewUser = true;
      } else if (!user.auth0Id) {
        // Usuario existente sin Auth0, vincular cuenta
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            auth0Id: auth0Profile.sub,
            provider: user.provider || this.getProviderFromAuth0Sub(auth0Profile.sub),
            avatar: auth0Profile.picture || user.avatar,
            emailVerified: auth0Profile.email_verified || user.emailVerified,
          }
        });
      }

      // Generar token JWT compatible con el sistema actual
      const token = JWTUtils.generateToken({
        userId: user.id,
        email: user.email
      });

      const userResponse: UserResponse = {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        createdAt: user.createdAt,
        isActive: user.isActive,
        emailVerified: user.emailVerified
      };

      return { user: userResponse, token, isNewUser };
    } catch (error) {
      console.error('Error en findOrCreateFromAuth0:', error);
      throw new Error('Error procesando usuario de Auth0');
    }
  }

  // NUEVO - Actualizar usuario con datos de Auth0
  static async updateFromAuth0(userId: string, auth0Profile: any): Promise<UserResponse> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          nombre: auth0Profile.name,
          avatar: auth0Profile.picture,
          emailVerified: auth0Profile.email_verified || true,
        }
      });

      return {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        createdAt: user.createdAt,
        isActive: user.isActive,
        emailVerified: user.emailVerified
      };
    } catch (error) {
      console.error('Error actualizando usuario desde Auth0:', error);
      throw new Error('Error actualizando información del usuario');
    }
  }

  // NUEVO - Helper para determinar proveedor
  private static getProviderFromAuth0Sub(sub: string): string {
    if (sub.startsWith('google-oauth2|')) return 'google';
    if (sub.startsWith('github|')) return 'github';
    if (sub.startsWith('auth0|')) return 'email';
    return 'social';
  }

  // NUEVO - Buscar usuario por Auth0 ID
  static async getUserByAuth0Id(auth0Id: string): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { auth0Id },
      select: {
        id: true,
        nombre: true,
        email: true,
        createdAt: true,
        isActive: true,
        emailVerified: true
      }
    });

    return user;
  }
}