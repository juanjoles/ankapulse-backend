import prisma from '../models/prisma';
import { PasswordUtils } from '../utils/password';
import { JWTUtils } from '../utils/jwt';

export interface CreateUserInput {
  nombre: string;
  email: string;
  password: string;
}

export interface LoginUserInput {
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
  // Crear usuario Y profile en una transacción atómica
  const user = await prisma.$transaction(async (tx) => {
    // 1. Crear usuario
    const newUser = await tx.user.create({
      data: {
        nombre: userData.nombre,
        email: userData.email,
        password: hashedPassword,
        provider: 'email',
      }
    });

    // 2. Crear profile con plan FREE por defecto
    await tx.profile.create({
      data: {
        userId: newUser.id,
        planType: 'free',
        maxChecks: 5,
        minIntervalMinutes: 30,
        maxRegions: 1,
        dataRetentionDays: 7,
        alertCooldownMin: 30,
        currentChecks: 0,
        planStartedAt: new Date(),
        planExpiresAt: null, // Plan free no expira
      }
    });

    return newUser;
  });

  console.log(`✅ Usuario y Profile creados: ${user.email} (Plan: FREE)`);

    // Generar token JWT
    const token = JWTUtils.generateToken({
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
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

  
static async loginUser(loginData: LoginUserInput): Promise<{ user: UserResponse; token: string }> {
  const { email, password } = loginData;

  // Validaciones
  if (!email || !password) {
    throw new Error('Email y password son requeridos');
  }

  // Buscar usuario por email (incluyendo password para validación)
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error('Credenciales inválidas');
  }

  // Verificar que el usuario tenga password (no es OAuth/Auth0)
  if (!user.password) {
    throw new Error('Este usuario fue registrado con Google/GitHub. Por favor inicia sesión con ese método.');
  }

  // Verificar que la cuenta esté activa
  if (!user.isActive) {
    throw new Error('Esta cuenta ha sido desactivada');
  }

  // Comparar password usando PasswordUtils
  const isPasswordValid = await PasswordUtils.comparePassword(password, user.password);

  if (!isPasswordValid) {
    throw new Error('Credenciales inválidas');
  }

  // Actualizar última conexión
  await prisma.user.update({
    where: { id: user.id },
    data: { updatedAt: new Date() },
  });

  // Generar token JWT
  const token = JWTUtils.generateToken({
    userId: user.id,
    email: user.email,
    nombre: user.nombre,
  });

  console.log(`✅ Login exitoso: ${user.email}`);

  // Retornar usuario sin password y token
  const userResponse: UserResponse = {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    avatar: user.avatar || undefined,
    provider: user.provider || undefined,
    createdAt: user.createdAt,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
  };

  return { user: userResponse, token };
}

// OPCIONAL: Método para actualizar perfil
static async updateUser(userId: string, updateData: { nombre?: string; avatar?: string }): Promise<UserResponse> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(updateData.nombre && { nombre: updateData.nombre }),
      ...(updateData.avatar && { avatar: updateData.avatar }),
      updatedAt: new Date(),
    },
  });

  console.log(`✅ Perfil actualizado: ${user.email}`);

  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    avatar: user.avatar || undefined,
    provider: user.provider || undefined,
    createdAt: user.createdAt,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
  };
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
      // Crear nuevo usuario desde Auth0 con Profile en transacción atómica
      const provider = this.getProviderFromAuth0Sub(auth0Profile.sub);
      
      user = await prisma.$transaction(async (tx) => {
        console.log('🔄 Iniciando transacción para crear usuario OAuth...');
        
        // 1. Crear usuario
        const newUser = await tx.user.create({
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
        
        console.log('✅ Usuario OAuth creado:', newUser.id);

        // 2. Crear profile con plan FREE por defecto
        const newProfile = await tx.profile.create({
          data: {
            userId: newUser.id,
            planType: 'free',
            maxChecks: 5,
            minIntervalMinutes: 30,
            maxRegions: 1,
            dataRetentionDays: 7,
            alertCooldownMin: 30,
            currentChecks: 0,
            planStartedAt: new Date(),
            planExpiresAt: null, // Plan free no expira
          }
        });
        
        console.log('✅ Profile OAuth creado:', newProfile.id);
        
        return newUser;
      });
      
      isNewUser = true;
      console.log(`✅ Usuario OAuth y Profile creados: ${user.email} (Plan: FREE) (Provider: ${provider})`);
      
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
      
      console.log(`✅ Cuenta vinculada con Auth0: ${user.email}`);
    }

    // Generar token JWT compatible con el sistema actual
    const token = JWTUtils.generateToken({
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
    });

    const userResponse: UserResponse = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      avatar: user.avatar || undefined,
      provider: user.provider || undefined,
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