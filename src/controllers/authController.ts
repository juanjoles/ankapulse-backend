// src/controllers/authController.ts
import { Request, Response } from 'express';
import { UserService, CreateUserInput, LoginUserInput } from '../services/userService';
import { emailService } from '../services/emailService';

export class AuthController {
  /**
   * REGISTER - Crear nuevo usuario con email/password
   * POST /api/auth/register
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserInput = req.body;
      
      const {user, token,} = await UserService.createUser(userData);
      try {
      await emailService.sendWelcomeEmail(user.email, user.nombre);
      console.log(`📧 Welcome email sent to ${user.email}`);
    } catch (emailError) {
      // No fallar el registro si el email falla
      console.error('❌ Failed to send welcome email:', emailError);
    }
      res.status(201).json({
        status: 'success',
        message: 'Usuario registrado exitosamente',
        data: {
          user,
          token,
        }
      });
      
      console.log(`✅ Registro exitoso: ${user.email}`);
      
    } catch (error) {
      console.error('Error en registro de usuario:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      
      // Determinar código de error apropiado
      let statusCode = 500;
      if (errorMessage.includes('ya está registrado')) {
        statusCode = 409; // Conflict
      } else if (errorMessage.includes('inválido') || errorMessage.includes('requeridos')) {
        statusCode = 400; // Bad Request
      }
      
      res.status(statusCode).json({
        status: 'error',
        message: errorMessage
      });
    }
  }

  /**
   * LOGIN - Iniciar sesión con email/password
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: LoginUserInput = req.body;
      
      const result = await UserService.loginUser(loginData);
      
      res.status(200).json({
        status: 'success',
        message: 'Login exitoso',
        data: {
          user: result.user,
          token: result.token
        }
      });
      
      console.log(`✅ Login exitoso: ${result.user.email}`);
      
    } catch (error) {
      console.error('Error en login:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      
      // Determinar código de error apropiado
      let statusCode = 500;
      if (errorMessage.includes('Credenciales inválidas') || errorMessage.includes('no encontrado')) {
        statusCode = 401; // Unauthorized
      } else if (errorMessage.includes('desactivada')) {
        statusCode = 403; // Forbidden
      } else if (errorMessage.includes('requeridos')) {
        statusCode = 400; // Bad Request
      } else if (errorMessage.includes('Google/GitHub')) {
        statusCode = 400; // Bad Request - debe usar OAuth
      }
      
      res.status(statusCode).json({
        status: 'error',
        message: errorMessage
      });
    }
  }
}