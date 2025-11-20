import prisma from '../models/prisma';
import { CreateCheckRequest } from '../types';
import { validateUrlAccessibility } from '../utils/urlValidator';
import { Check } from '@prisma/client';
import { PlanService } from './planService';

export class CheckService {

async createCheck(userId: string, checkData: CreateCheckRequest): Promise<Check> {
  // ✅ Verificar límite de checks según el plan del usuario
  const canCreate = await PlanService.canCreateCheck(userId);
  
  if (!canCreate.allowed) {
    throw new Error(canCreate.reason || 'Límite de checks alcanzado');
  }

  // ✅ Validar que el intervalo sea permitido según el plan
  const intervalValidation = await PlanService.isIntervalAllowed(userId, checkData.interval);
  
  if (!intervalValidation.allowed) {
    throw new Error(intervalValidation.reason || 'Intervalo no permitido para tu plan');
  }

  // Validar accesibilidad de la URL
  const urlValidation = await validateUrlAccessibility(checkData.url);
  if (!urlValidation.isAccessible) {
    throw new Error(urlValidation.error || 'URL no es accesible');
  }

  // Crear el check en la base de datos
  const check = await prisma.check.create({
    data: {
      userId,
      url: checkData.url,
      name: checkData.name,
      interval: checkData.interval,
      regions: checkData.regions,
      timeout: checkData.timeout || 30,
      expectedStatusCode: checkData.expectedStatusCode || 200,
      status: 'active'
    }
  });

  // ✅ Actualizar contador de checks del usuario
  await PlanService.updateCheckCount(userId);

  return check;
}

  async getUserChecks(userId: string): Promise<Check[]> {
    const checks = await prisma.check.findMany({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' }
    });

    return checks;
  }

  async getCheckById(id: string, userId: string): Promise<Check | null> {
    const check = await prisma.check.findFirst({
      where: { 
        id,
        userId 
      }
    });

    return check;
  }

  // Función básica para ejecutar un check individual (preparación para workers)
  async executeCheck(checkId: string): Promise<{ status: string; responseTime: number }> {
    const check = await prisma.check.findUnique({
      where: { id: checkId }
    });

    if (!check) {
      throw new Error('Check no encontrado');
    }

    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), check.timeout * 1000);

      const response = await fetch(check.url, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      const status = response.status === check.expectedStatusCode ? 'up' : 'down';

      // Actualizar el check con los resultados
      await prisma.check.update({
        where: { id: checkId },
        data: {
          lastCheckAt: new Date(),
          lastStatus: status,
          failureCount: status === 'down' ? check.failureCount + 1 : 0
        }
      });

      return { status, responseTime };
    } catch (error) {
      // Actualizar como timeout/failed
      await prisma.check.update({
        where: { id: checkId },
        data: {
          lastCheckAt: new Date(),
          lastStatus: 'timeout',
          failureCount: check.failureCount + 1
        }
      });

      return { status: 'timeout', responseTime: check.timeout * 1000 };
    }
  }
}