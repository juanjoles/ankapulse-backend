import { Request, Response, NextFunction } from 'express';
import { PlanService } from '../services/planService';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    sub: string;
  };
}

/**
 * Middleware para validar la creación de checks según el plan del usuario
 */
export async function validateCheckCreation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId || req.user?.sub;
    
    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Usuario no autenticado'
      });
      return;
    }

    // Obtener perfil del usuario
    const userProfile = await PlanService.getUserProfile(userId);
    
    if (!userProfile) {
      res.status(404).json({
        status: 'error',
        message: 'Perfil de usuario no encontrado'
      });
      return;
    }

    // Verificar límites del plan
    const currentChecksCount = await PlanService.getUserChecksCount(userId);
    
    if (currentChecksCount >= userProfile.maxChecks) {
      res.status(400).json({
        status: 'error',
        message: `Has alcanzado el límite de ${userProfile.maxChecks} checks para tu plan ${userProfile.planType}`,
        data: {
          currentChecks: currentChecksCount,
          maxChecks: userProfile.maxChecks,
          planType: userProfile.planType
        }
      });
      return;
    }

    // Validar intervalo mínimo
    const { interval } = req.body;
    if (interval) {
      const intervalMinutes = parseInterval(interval);
      if (intervalMinutes < userProfile.minIntervalMinutes) {
        res.status(400).json({
          status: 'error',
          message: `El intervalo mínimo para tu plan ${userProfile.planType} es de ${userProfile.minIntervalMinutes} minutos`,
          data: {
            requestedInterval: interval,
            minInterval: `${userProfile.minIntervalMinutes}min`,
            planType: userProfile.planType
          }
        });
        return;
      }
    }

    // Todo está bien, continuar
    next();

  } catch (error) {
    console.error('Error en validación de plan:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al validar límites del plan'
    });
  }
}

/**
 * Middleware para validar la actualización de checks según el plan del usuario
 */
export async function validateCheckUpdate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId || req.user?.sub;
    
    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Usuario no autenticado'
      });
      return;
    }

    // Solo validar si se está actualizando el intervalo
    const { interval } = req.body;
    if (!interval) {
      next();
      return;
    }

    // Obtener perfil del usuario
    const userProfile = await PlanService.getUserProfile(userId);
    
    if (!userProfile) {
      res.status(404).json({
        status: 'error',
        message: 'Perfil de usuario no encontrado'
      });
      return;
    }

    // Validar intervalo mínimo
    const intervalMinutes = parseInterval(interval);
    if (intervalMinutes < userProfile.minIntervalMinutes) {
      res.status(400).json({
        status: 'error',
        message: `El intervalo mínimo para tu plan ${userProfile.planType} es de ${userProfile.minIntervalMinutes} minutos`,
        data: {
          requestedInterval: interval,
          minInterval: `${userProfile.minIntervalMinutes}min`,
          planType: userProfile.planType
        }
      });
      return;
    }

    // Todo está bien, continuar
    next();

  } catch (error) {
    console.error('Error en validación de actualización:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al validar actualización del check'
    });
  }
}

/**
 * Convertir intervalo string a minutos
 */
function parseInterval(interval: string): number {
  const intervalMap: { [key: string]: number } = {
    '1min': 1,
    '5min': 5,
    '15min': 15,
    '30min': 30,
    '1hour': 60,
    '6hour': 360,
    '12hour': 720,
    '24hour': 1440
  };

  return intervalMap[interval] || 30; // Default 30 min si no se encuentra
}