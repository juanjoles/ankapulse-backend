import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SchedulerService } from '../services/scheduler.service';

const prisma = new PrismaClient();
const schedulerService = new SchedulerService();

// Crear un nuevo check
export async function createCheck(req: Request, res: Response): Promise<void> {
  try {
    const { url, name, interval, timeout, expectedStatusCode, regions } = req.body;
    const userId = req.user?.sub || req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    const check = await prisma.check.create({
      data: {
        userId: userId,
        url: url,
        name: name || null,
        interval: interval || '5min',
        regions: regions || [],
        timeout: timeout || 30,
        expectedStatusCode: expectedStatusCode || 200,
        status: 'active',
      },
    });
    
    await schedulerService.scheduleCheck(check, true);

   
    res.status(201).json({
      success: true,
      data:{
        check:check
      }
    });
  } catch (error) {
    console.error('Error creating check:', error);
    res.status(500).json({ error: 'Failed to create check' });
  }
}

// Actualizar un check
export async function updateCheck(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { url, name, interval, timeout, expectedStatusCode, regions, status } = req.body;
    const userId = req.user?.sub;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const existingCheck = await prisma.check.findFirst({
      where: { id, userId },
    });

    if (!existingCheck) {
      res.status(404).json({ error: 'Check not found or unauthorized' });
      return;
    }

    // Construir objeto de actualización
    const updateData: any = {};
    if (url !== undefined) updateData.url = url;
    if (name !== undefined) updateData.name = name;
    if (interval !== undefined) updateData.interval = interval;
    if (timeout !== undefined) updateData.timeout = timeout;
    if (expectedStatusCode !== undefined) updateData.expectedStatusCode = expectedStatusCode;
    if (regions !== undefined) updateData.regions = regions;  
    if (status !== undefined) updateData.status = status;

    const check = await prisma.check.update({
      where: { id },
      data: updateData,
    });

    await schedulerService.updateCheck(check);

    res.json(check);
  } catch (error) {
    console.error('Error updating check:', error);
    res.status(500).json({ error: 'Failed to update check' });
  }
}

// Eliminar un check
export async function deleteCheck(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.sub;

    // Validar que el usuario esté autenticado
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Verificar que el check pertenece al usuario
    const existingCheck = await prisma.check.findFirst({
      where: { id, userId },
    });

    if (!existingCheck) {
      res.status(404).json({ error: 'Check not found or unauthorized' });
      return;
    }

    // Remover de la cola primero
    await schedulerService.removeCheck(id);

    // Eliminar de la base de datos
    await prisma.check.delete({ where: { id } });

    res.json({ message: 'Check deleted successfully' });
  } catch (error) {
    console.error('Error deleting check:', error);
    res.status(500).json({ error: 'Failed to delete check' });
  }
}

// Obtener todos los checks del usuario
export async function getChecks(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub;

    // Validar que el usuario esté autenticado
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const checks = await prisma.check.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // ✨ AGREGAR: Calcular métricas básicas para cada check
    const checksWithMetrics = await Promise.all(
      checks.map(async (check) => {
        // Obtener resultados de los últimos 30 días
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const results = await prisma.checkResult.findMany({
          where: { 
            checkId: check.id,
            timestamp: { gte: sevenDaysAgo  }
          },
          select: { success: true, latencyMs: true }
        });

        const totalChecks = results.length;
        const successfulChecks = results.filter(r => r.success).length;
        const uptimePercentage = totalChecks > 0 
          ? parseFloat(((successfulChecks / totalChecks) * 100).toFixed(2))
          : 0;
        
        const avgLatency = totalChecks > 0
          ? Math.round(results.reduce((sum, r) => sum + (r.latencyMs || 0), 0) / totalChecks)
          : 0;

        return {
          ...check,
          uptimePercentage,
          averageLatency: avgLatency,
          totalChecks,
          successfulChecks
        };
      })
    );

    res.json(checksWithMetrics);
  } catch (error) {
    console.error('Error fetching checks:', error);
    res.status(500).json({ error: 'Failed to fetch checks' });
  }
}

// Obtener un check específico
export async function getCheck(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.sub;

    // Validar que el usuario esté autenticado
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const check = await prisma.check.findFirst({
      where: { id, userId },
    });

    if (!check) {
      res.status(404).json({ error: 'Check not found or unauthorized' });
      return;
    }

    res.json(check);
  } catch (error) {
    console.error('Error fetching check:', error);
    res.status(500).json({ error: 'Failed to fetch check' });
  }
}

// Obtener resultados de un check específico
export async function getCheckResults(req: Request, res: Response): Promise<void> {
  try {
    const { id: checkId } = req.params;
    const { region, startDate, endDate, limit = '100' } = req.query;
    const userId = req.user?.sub;

    // Validar que el usuario esté autenticado
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Verificar que el check pertenece al usuario
    const check = await prisma.check.findFirst({
      where: { id: checkId, userId },
    });

    if (!check) {
      res.status(404).json({ error: 'Check not found or unauthorized' });
      return;
    }

    // Construir filtros
    const where: any = { checkId };

    if (region) {
      where.region = region as string;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate as string);
      if (endDate) where.timestamp.lte = new Date(endDate as string);
    }

    // Consultar resultados
    const results = await prisma.checkResult.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
    });

    // Calcular métricas
    const totalChecks = results.length;
    const successfulChecks = results.filter(r => r.success).length;
    const uptimePercentage = totalChecks > 0 
      ? ((successfulChecks / totalChecks) * 100).toFixed(2) 
      : '0.00';
    
    const avgLatency = totalChecks > 0
      ? Math.round(results.reduce((sum, r) => sum + r.latencyMs, 0) / totalChecks)
      : 0;

    res.json({
      checkId,
      metrics: {
        totalChecks,
        successfulChecks,
        failedChecks: totalChecks - successfulChecks,
        uptimePercentage: `${uptimePercentage}%`,
        averageLatencyMs: avgLatency,
      },
      results: results.map(r => ({
        id: r.id,
        region: r.region,
        statusCode: r.statusCode,
        latencyMs: r.latencyMs,
        success: r.success,
        errorMessage: r.errorMessage,
        timestamp: r.timestamp,
      })),
    });

  } catch (error: any) {
    console.error('Error fetching check results:', error);
    res.status(500).json({ error: 'Failed to fetch check results' });
  }
}