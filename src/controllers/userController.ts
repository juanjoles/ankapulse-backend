import { Request, Response } from 'express';
import { UserService, CreateUserInput, LoginUserInput } from '../services/userService';

export class UserController {
//   static async register(req: Request, res: Response): Promise<void> {
//     try {
//       const userData: CreateUserInput = req.body;
      
//       const result = await UserService.createUser(userData);
      
//       res.status(201).json({
//         status: 'success',
//         message: 'Usuario registrado exitosamente',
//         data: {
//           user: result.user,
//           token: result.token
//         }
//       });
//     } catch (error) {
//       console.error('Error en registro de usuario:', error);
      
//       const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
//       const statusCode = errorMessage.includes('ya está registrado') ? 409 : 500;
      
//       res.status(statusCode).json({
//         status: 'error',
//         message: errorMessage
//       });
//     }
//   }

//   /**
//  * LOGIN - Iniciar sesión
//  * POST /api/users/login
//  */
// static async login(req: Request, res: Response): Promise<void> {
//   try {
//     const loginData: LoginUserInput = req.body;
    
//     const result = await UserService.loginUser(loginData);
    
//     res.status(200).json({
//       status: 'success',
//       message: 'Login exitoso',
//       data: {
//         user: result.user,
//         token: result.token
//       }
//     });
//   } catch (error) {
//     console.error('Error en login:', error);
    
//     const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    
//     // Determinar status code según el tipo de error
//     let statusCode = 500;
//     if (errorMessage.includes('Credenciales inválidas') || errorMessage.includes('no encontrado')) {
//       statusCode = 401;
//     } else if (errorMessage.includes('desactivada')) {
//       statusCode = 403;
//     } else if (errorMessage.includes('requeridos')) {
//       statusCode = 400;
//     }
    
//     res.status(statusCode).json({
//       status: 'error',
//       message: errorMessage
//     });
//   }
// }

/**
 * UPDATE PROFILE - Actualizar perfil del usuario
 * PATCH /api/users/me
 */
static async updateProfile(req: any, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Usuario no autenticado'
      });
      return;
    }

    const { nombre, avatar, email } = req.body;

    const updatedUser = await UserService.updateUser(userId, { nombre, avatar, email });

    res.status(200).json({
      status: 'success',
      message: 'Perfil actualizado exitosamente',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Error al actualizar perfil'
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