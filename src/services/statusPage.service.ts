import prisma from '../models/prisma';
import { StatusPage, Check } from '@prisma/client';

interface CreateStatusPageData {
  slug: string;
  enabled: boolean;
  title?: string;
  description?: string;
  monitorIds: string[]; // IDs de checks a mostrar
}

interface StatusPageWithMonitors extends StatusPage {
  monitors: Array<{
    id: string;
    checkId: string;
    displayOrder: number;
    check: Check;
  }>;
}

export class StatusPageService {
  
  // ====================================================
  // CREAR O ACTUALIZAR STATUS PAGE
  // ====================================================
  async createOrUpdateStatusPage(
    userId: string, 
    data: CreateStatusPageData
  ): Promise<StatusPage> {
    
    // 1. Validar que el slug sea válido (alfanumérico + guiones)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(data.slug)) {
      throw new Error('Slug inválido. Solo letras minúsculas, números y guiones.');
    }

    // 2. Validar longitud del slug
    if (data.slug.length < 3 || data.slug.length > 50) {
      throw new Error('El slug debe tener entre 3 y 50 caracteres.');
    }

    // 3. Verificar que todos los monitors pertenecen al usuario
    if (data.monitorIds.length > 0) {
      const userChecks = await prisma.check.findMany({
        where: { 
          userId,
          id: { in: data.monitorIds }
        }
      });

      if (userChecks.length !== data.monitorIds.length) {
        throw new Error('Algunos monitores no pertenecen al usuario o no existen');
      }
    }

    // 4. Verificar si ya existe una status page para este usuario
    const existingStatusPage = await prisma.statusPage.findUnique({
      where: { userId }
    });

    if (existingStatusPage) {
      // ====================================
      // UPDATE: Ya existe, actualizar
      // ====================================
      
      // Verificar si el slug cambió y si está disponible
      if (existingStatusPage.slug !== data.slug) {
        const slugTaken = await prisma.statusPage.findUnique({
          where: { slug: data.slug }
        });
        
        if (slugTaken) {
          throw new Error('Este slug ya está en uso por otro usuario');
        }
      }

      // Actualizar status page
      const updatedStatusPage = await prisma.statusPage.update({
        where: { userId },
        data: {
          slug: data.slug,
          enabled: data.enabled,
          title: data.title,
          description: data.description,
        }
      });

      // Eliminar monitores anteriores
      await prisma.statusPageMonitor.deleteMany({
        where: { statusPageId: updatedStatusPage.id }
      });

      // Crear nuevos monitores
      if (data.monitorIds.length > 0) {
        await Promise.all(
          data.monitorIds.map((checkId, index) =>
            prisma.statusPageMonitor.create({
              data: {
                statusPageId: updatedStatusPage.id,
                checkId,
                displayOrder: index
              }
            })
          )
        );
      }

      return updatedStatusPage;

    } else {
      // ====================================
      // CREATE: No existe, crear nuevo
      // ====================================
      
      // Verificar que el slug esté disponible
      const slugTaken = await prisma.statusPage.findUnique({
        where: { slug: data.slug }
      });
      
      if (slugTaken) {
        throw new Error('Este slug ya está en uso');
      }

      // Crear status page
      const newStatusPage = await prisma.statusPage.create({
        data: {
          userId,
          slug: data.slug,
          enabled: data.enabled,
          title: data.title,
          description: data.description,
        }
      });

      // Crear monitores asociados
      if (data.monitorIds.length > 0) {
        await Promise.all(
          data.monitorIds.map((checkId, index) =>
            prisma.statusPageMonitor.create({
              data: {
                statusPageId: newStatusPage.id,
                checkId,
                displayOrder: index
              }
            })
          )
        );
      }

      return newStatusPage;
    }
  }

  // ====================================================
  // OBTENER CONFIG DE STATUS PAGE (PRIVADO)
  // ====================================================
  async getStatusPageConfig(userId: string): Promise<StatusPageWithMonitors | null> {
    const statusPage = await prisma.statusPage.findUnique({
      where: { userId },
      include: {
        monitors: {
          include: {
            check: true
          },
          orderBy: {
            displayOrder: 'asc'
          }
        }
      }
    });

    return statusPage;
  }

  // ====================================================
  // OBTENER STATUS PAGE PÚBLICO (SIN AUTH)
  // ====================================================
  async getPublicStatusPage(slug: string) {
    // 1. Buscar status page por slug
    const statusPage = await prisma.statusPage.findUnique({
      where: { slug },
      include: {
        monitors: {
          include: {
            check: true
          },
          orderBy: {
            displayOrder: 'asc'
          }
        }
      }
    });

    // 2. Si no existe o está deshabilitado, retornar null
    if (!statusPage || !statusPage.enabled) {
      return null;
    }

    // 3. Calcular métricas de cada monitor
    const monitorsWithMetrics = await Promise.all(
      statusPage.monitors.map(async (monitor) => {
        const check = monitor.check;
        
        // Obtener resultados de los últimos 7 días
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const results = await prisma.checkResult.findMany({
          where: { 
            checkId: check.id,
            timestamp: { gte: sevenDaysAgo }
          },
          select: { 
            success: true, 
            latencyMs: true,
            timestamp: true 
          },
          orderBy: { timestamp: 'desc' }
        });

        const totalChecks = results.length;
        const successfulChecks = results.filter(r => r.success).length;
        const uptimePercentage = totalChecks > 0 
          ? parseFloat(((successfulChecks / totalChecks) * 100).toFixed(2))
          : 0;
        
        const avgLatency = totalChecks > 0
          ? Math.round(results.reduce((sum, r) => sum + (r.latencyMs || 0), 0) / totalChecks)
          : 0;

        // Status actual (último check)
        const lastResult = results[0];
        const currentStatus = lastResult?.success ? 'operational' : 'down';

        return {
          id: check.id,
          name: check.name || check.url,
          url: check.url,
          status: currentStatus,
          uptimePercentage,
          averageLatency: avgLatency,
          lastChecked: lastResult?.timestamp || null
        };
      })
    );

    // 4. Calcular overall status
    const allOperational = monitorsWithMetrics.every(m => m.status === 'operational');
    const someDown = monitorsWithMetrics.some(m => m.status === 'down');
    
    const overallStatus = allOperational 
      ? 'operational' 
      : someDown 
      ? 'major_outage' 
      : 'partial_outage';

    // 5. Retornar data pública
    return {
      slug: statusPage.slug,
      title: statusPage.title || 'Service Status',
      description: statusPage.description || null,
      overallStatus,
      updatedAt: new Date(),
      monitors: monitorsWithMetrics
    };
  }

  // ====================================================
  // DESHABILITAR STATUS PAGE
  // ====================================================
  async disableStatusPage(userId: string): Promise<void> {
    const statusPage = await prisma.statusPage.findUnique({
      where: { userId }
    });

    if (!statusPage) {
      throw new Error('Status page no encontrado');
    }

    await prisma.statusPage.update({
      where: { userId },
      data: { enabled: false }
    });
  }

  // ====================================================
  // VERIFICAR DISPONIBILIDAD DE SLUG
  // ====================================================
  async isSlugAvailable(slug: string, userId?: string): Promise<boolean> {
    // Validar formato del slug
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return false; // Slug inválido = no disponible
    }

    const existing = await prisma.statusPage.findUnique({
      where: { slug }
    });

    // Si no existe, está disponible
    if (!existing) return true;

    // Si existe pero es del mismo usuario, está disponible
    if (userId && existing.userId === userId) return true;

    // Está tomado por otro usuario
    return false;
  }
}