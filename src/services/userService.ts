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
  createdAt: Date;
  isActive: boolean;
  emailVerified: boolean;
}

export class UserService {
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
}