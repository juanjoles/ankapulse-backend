import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { CheckService } from '../services/checkService';
import { CreateCheckRequest, CheckResponse } from '../types';
import { Check } from '@prisma/client';

export class CheckController {
  private checkService: CheckService;

  constructor() {
    this.checkService = new CheckService();
  }

  createCheck = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Verificación adicional de seguridad
      if (!req.user || !req.user.userId) {
        console.log('Request sin usuario autenticado recibida');
        res.status(401).json({
          status: 'error',
          message: 'Usuario no autenticado'
        } as CheckResponse);
        return;
      }

      const userId = req.user.userId;

      const checkData: CreateCheckRequest = req.body;
      
      const check = await this.checkService.createCheck(userId, checkData);

      res.status(201).json({
        status: 'success',
        message: 'Check creado exitosamente',
        data: {
          check
        }
      } as CheckResponse);
    } catch (error: any) {
      console.error('Error creating check:', error);
      
      let statusCode = 500;
      let message = 'Error interno del servidor';

      if (error.message.includes('Límite máximo')) {
        statusCode = 400;
        message = error.message;
      } else if (error.message.includes('URL no es accesible') || error.message.includes('no encontrado')) {
        statusCode = 400;
        message = error.message;
      }

      res.status(statusCode).json({
        status: 'error',
        message,
        errors: [error.message]
      } as CheckResponse);
    }
  };

  getUserChecks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Usuario no autenticado'
        });
        return;
      }

      const checks = await this.checkService.getUserChecks(userId);

      res.status(200).json({
        status: 'success',
        message: 'Checks obtenidos exitosamente',
        data: {
          checks,
          count: checks.length
        }
      });
    } catch (error: any) {
      console.error('Error fetching user checks:', error);
      
      res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor',
        errors: [error.message]
      });
    }
  };

  getCheckById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Usuario no autenticado'
        });
        return;
      }

      const { id } = req.params;
      const check = await this.checkService.getCheckById(id, userId);

      if (!check) {
        res.status(404).json({
          status: 'error',
          message: 'Check no encontrado'
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        message: 'Check obtenido exitosamente',
        data: {
          check
        }
      });
    } catch (error: any) {
      console.error('Error fetching check by id:', error);
      
      res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor',
        errors: [error.message]
      });
    }
  };
}