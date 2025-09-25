import { Request, Response } from 'express';
import { UserService, CreateUserInput } from '../services/userService';

export class UserController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserInput = req.body;
      
      const result = await UserService.createUser(userData);
      
      res.status(201).json({
        status: 'success',
        message: 'Usuario registrado exitosamente',
        data: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error) {
      console.error('Error en registro de usuario:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      const statusCode = errorMessage.includes('ya está registrado') ? 409 : 500;
      
      res.status(statusCode).json({
        status: 'error',
        message: errorMessage
      });
    }
  }

  static async getProfile(req: any, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Usuario no autenticado'
        });
        return;
      }

      const user = await UserService.getUserById(userId);
      
      if (!user) {
        res.status(404).json({
          status: 'error',
          message: 'Usuario no encontrado'
        });
        return;
      }
      
      res.status(200).json({
        status: 'success',
        message: 'Perfil obtenido exitosamente',
        data: { user }
      });
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      
      res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor'
      });
    }
  }
}