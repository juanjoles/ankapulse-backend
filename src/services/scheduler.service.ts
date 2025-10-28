import { PrismaClient } from '@prisma/client';
import { monitorQueue } from '../config/redis.config';

const prisma = new PrismaClient();

export class SchedulerService {
  
  // Sincronizar todos los checks activos
  async syncChecks() {
    try {
      const activeChecks = await prisma.check.findMany({
        where: { status: 'active' },
      });

      console.log(`📋 Syncing ${activeChecks.length} active checks...`);

      for (const check of activeChecks) {
        // En sync NO ejecutar inmediatamente, solo programar
        await this.scheduleCheck(check, false);
      }

      console.log('✅ All checks synchronized');
    } catch (error) {
      console.error('❌ Error syncing checks:', error);
      throw error;
    }
  }

  // Programar un check individual
  async scheduleCheck(check: any, executeImmediately = false) {
    try {
      const repeatPattern = this.getRepeatPattern(check.interval);
      
      
      // Job repetible (según intervalo)
      await monitorQueue.add(
        `check-${check.id}`,
        {
          checkId: check.id,
          url: check.url,
          userId: check.userId,
          timeout: check.timeout,
          expectedStatusCode: check.expectedStatusCode,
        },
        {
          repeat: repeatPattern,
          jobId: check.id,
        }
      );


      // Primera ejecución inmediata si se solicita
      if (executeImmediately) {
         await monitorQueue.add(
          `check-immediate-${check.id}-${Date.now()}`,
          {
            checkId: check.id,
            url: check.url,
            userId: check.userId,
            timeout: check.timeout,
            expectedStatusCode: check.expectedStatusCode,
          }
        );
      }
     console.log(`✅ Check ${check.id} scheduled with interval ${check.interval}`);
    } catch (error) {
      console.error(`❌ Error scheduling check ${check.id}:`, error);
      throw error;
    }
  }

  // Remover un check de la cola
  async removeCheck(checkId: string) {
    try {
      const repeatableJobs = await monitorQueue.getRepeatableJobs();
      const job = repeatableJobs.find(j => j.id === checkId);
      
      if (job) {
        await monitorQueue.removeRepeatableByKey(job.key);
        console.log(`✅ Check ${checkId} removed from queue`);
      }
    } catch (error) {
      console.error(`❌ Error removing check ${checkId}:`, error);
      throw error;
    }
  }

  // Actualizar un check (remover y volver a programar)
  async updateCheck(check: any) {
    await this.removeCheck(check.id);
    await this.scheduleCheck(check, false); // No ejecutar inmediatamente en updates
  }

  // Convertir intervalos a patrones cron
private getRepeatPattern(interval: string) {
  switch (interval) {
    case '1min':
      return { pattern: '* * * * *' }; // Cada minuto
    case '5min':
      return { pattern: '*/5 * * * *' }; // Cada 5 minutos
    case '15min':
      return { pattern: '*/15 * * * *' }; // Cada 15 minutos
    case '30min':
      return { pattern: '*/30 * * * *' }; // Cada 30 minutos
    case '1h':
      return { pattern: '0 * * * *' }; // Cada hora en punto
    case '1d':
      return { pattern: '0 0 * * *' }; // Cada día a medianoche
    default:
      return { pattern: '*/30 * * * *' }; // Default: cada 30 minutos
  }
}
}