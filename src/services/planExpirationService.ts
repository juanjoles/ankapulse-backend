import prisma from '../models/prisma';
import { PlanService } from './planService';
import cron from 'node-cron';

export class PlanExpirationService {
  
  /**
   * Procesar expiraciones diarias (ejecutar via cron)
   */
  static async processExpirations(): Promise<void> {
    try {
      console.log('🕐 Iniciando verificación de planes expirados...');
      
      const now = new Date();
      
      // Buscar perfiles con planes expirados
      const expiredProfiles = await prisma.profile.findMany({
        where: {
          planType: { not: 'free' }, // No procesar planes free
          planExpiresAt: {
            lte: now // Menor o igual a ahora
          }
        },
        include: {
          user: {
            select: { id: true, email: true, nombre: true }
          }
        }
      });

      console.log(`📊 Encontrados ${expiredProfiles.length} planes expirados`);

      for (const profile of expiredProfiles) {
        await this.expirePlan(profile.userId, profile.user);
      }

      console.log('✅ Procesamiento de expiraciones completado');

    } catch (error) {
      console.error('❌ Error procesando expiraciones:', error);
      // No lanzar error para evitar que se caiga el cron
    }
  }

  /**
   * Expirar plan individual
   */
  static async expirePlan(userId: string, user: any): Promise<void> {
    try {
      console.log(`⏰ Expirando plan para usuario: ${user.email}`);

      // 1. Hacer downgrade a FREE
      await PlanService.downgradeToFree(userId);

      // 2. Actualizar suscripción a expirada
      await prisma.subscription.updateMany({
        where: { userId },
        data: { status: 'expired' }
      });

      // 3. Limpiar fecha de expiración (ya expiró)
      await prisma.profile.update({
        where: { userId },
        data: { planExpiresAt: null }
      });

      // 4. Log de la expiración
      await this.logExpiration(userId, user);

      console.log(`✅ Plan expirado para usuario ${user.email}`);

    } catch (error) {
      console.error(`❌ Error expirando plan para usuario ${userId}:`, error);
      // No lanzar error para que siga procesando otros usuarios
    }
  }

  /**
   * Verificar planes próximos a expirar (7 días antes)
   */
  static async checkUpcomingExpirations(): Promise<void> {
    try {
      console.log('📅 Verificando planes próximos a expirar...');

      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

      const upcomingExpirations = await prisma.profile.findMany({
        where: {
          planType: { not: 'free' },
          planExpiresAt: {
            gte: now,
            lte: sevenDaysFromNow
          }
        },
        include: {
          user: {
            select: { id: true, email: true, nombre: true }
          }
        }
      });

      console.log(`📬 ${upcomingExpirations.length} planes expiran en los próximos 7 días`);

      for (const profile of upcomingExpirations) {
        await this.notifyUpcomingExpiration(profile);
      }

    } catch (error) {
      console.error('❌ Error verificando próximas expiraciones:', error);
    }
  }

  /**
   * Configurar plan con expiración (para pagos)
   */
  static async setPlanExpiration(userId: string, planType: string, durationDays: number = 30): Promise<void> {
    try {
      console.log(`📅 Configurando expiración para usuario ${userId}: ${planType} por ${durationDays} días`);

      // Usar Date.now() + días en milisegundos para evitar problemas con setDate()
      const expirationDate = new Date(Date.now() + (durationDays * 24 * 60 * 60 * 1000));

      await prisma.profile.update({
        where: { userId },
        data: {
          planExpiresAt: expirationDate,
          planStartedAt: new Date()
        }
      });

      console.log(`✅ Plan ${planType} configurado para expirar el: ${expirationDate.toLocaleDateString()}`);

    } catch (error) {
      console.error(`❌ Error configurando expiración:`, error);
      throw error;
    }
  }

  /**
   * Extender plan existente (para renovaciones)
   */
  static async extendPlan(userId: string, additionalDays: number): Promise<void> {
    try {
      console.log(`📅 Extendiendo plan para usuario ${userId} por ${additionalDays} días más`);

      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { planExpiresAt: true, planType: true }
      });

      if (!profile) {
        throw new Error('Usuario no encontrado');
      }

      // Si el plan ya expiró, extender desde ahora. Si no, desde la fecha actual de expiración
      const baseDate = profile.planExpiresAt && profile.planExpiresAt > new Date() 
        ? profile.planExpiresAt 
        : new Date();

      const newExpirationDate = new Date(baseDate.getTime() + (additionalDays * 24 * 60 * 60 * 1000));

      await prisma.profile.update({
        where: { userId },
        data: { planExpiresAt: newExpirationDate }
      });

      console.log(`✅ Plan extendido hasta: ${newExpirationDate.toLocaleDateString()}`);

    } catch (error) {
      console.error(`❌ Error extendiendo plan:`, error);
      throw error;
    }
  }

  /**
   * Inicializar cron jobs
   */
  static initializeCronJobs(): void {
    console.log('⏰ Inicializando cron jobs para expiración de planes...');

    // Verificar expiraciones diarias a las 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('🔄 Ejecutando tarea diaria de expiración de planes...');
      try {
        // Timeout de 5 minutos para evitar que se cuelgue
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout en procesamiento de expiraciones')), 5 * 60 * 1000)
        );

        await Promise.race([this.processExpirations(), timeoutPromise]);
      } catch (error) {
        console.error('❌ Error en tarea de expiración:', error);
      }
    });

    // Verificar próximas expiraciones semanalmente (lunes 10:00 AM)
    cron.schedule('0 10 * * 1', async () => {
      console.log('📅 Ejecutando verificación semanal de próximas expiraciones...');
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout en verificación de próximas expiraciones')), 3 * 60 * 1000)
        );

        await Promise.race([this.checkUpcomingExpirations(), timeoutPromise]);
      } catch (error) {
        console.error('❌ Error verificando próximas expiraciones:', error);
      }
    });

    console.log('✅ Cron jobs de expiración inicializados');
  }

  /**
   * Log de expiraciones para auditoría
   */
  private static async logExpiration(userId: string, user: any): Promise<void> {
    const logData = {
      userId,
      email: user.email,
      timestamp: new Date().toISOString(),
      action: 'plan_expired'
    };
    
    console.log(`📝 LOG EXPIRACIÓN - ${JSON.stringify(logData)}`);
    
    // TODO: Aquí podrías guardar en una tabla de logs si la tienes
    // await prisma.planExpirationLog.create({
    //   data: {
    //     userId,
    //     action: 'expired',
    //     metadata: logData
    //   }
    // });
  }

  /**
   * Notificar próxima expiración
   */
  private static async notifyUpcomingExpiration(profile: any): Promise<void> {
    const daysLeft = Math.ceil((profile.planExpiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    console.log(`📧 NOTIFICACIÓN - Plan de ${profile.user.email} expira en ${daysLeft} días`);
    
    // TODO: Aquí integrarías tu servicio de email (Resend)
    // await EmailService.sendExpirationWarning(profile.user.email, {
    //   userName: profile.user.nombre,
    //   planType: profile.planType,
    //   daysLeft,
    //   renewUrl: `${process.env.FRONTEND_URL}/billing`
    // });
  }

  /**
   * Método para testing manual
   */
  static async testExpiration(userId: string): Promise<void> {
    console.log(`🧪 TEST: Simulando expiración para usuario ${userId}`);
    
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { user: true }
    });

    if (!profile) {
      throw new Error('Usuario no encontrado');
    }

    await this.expirePlan(userId, profile.user);
  }

  /**
 * Método para testing - ejecutar cron manualmente
 */
static async testCronExecution(): Promise<void> {
  console.log('🧪 TEST: Ejecutando procesamiento manual de expiraciones...');
  await this.processExpirations();
}

// En PlanExpirationService.ts, agregar:
static initializeDataRetentionJobs(): void {
  // Ejecutar limpieza diaria a las 2:00 AM (23:00 UTC)
  cron.schedule('0 23 * * *', async () => {
    console.log('🗑️ Ejecutando limpieza de datos por retención...');
    try {
      await this.cleanupOldCheckResults();
    } catch (error) {
      console.error('❌ Error en limpieza de datos:', error);
    }
  });
}

/**
   * ELIMINAR resultados de checks antiguos según retención de datos
   */
static async cleanupOldCheckResults(): Promise<void> {
  // Obtener usuarios con sus límites de retención
  const profiles = await prisma.profile.findMany({
    select: {
      userId: true,
      planType: true,
      dataRetentionDays: true
    }
  });

  for (const profile of profiles) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - profile.dataRetentionDays);

    const deleted = await prisma.checkResult.deleteMany({
      where: {
        check: {
          userId: profile.userId
        },
        timestamp: {
          lt: cutoffDate
        }
      }
    });

    if (deleted.count > 0) {
      console.log(`🗑️ Eliminados ${deleted.count} registros para usuario ${profile.userId} (plan ${profile.planType})`);
    }
  }
}

  /**
   * Obtener información de expiración de un usuario
   */
  static async getUserExpirationInfo(userId: string): Promise<{
    planType: string;
    expiresAt: Date | null;
    daysLeft: number | null;
    isExpired: boolean;
  }> {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { planType: true, planExpiresAt: true }
    });

    if (!profile) {
      throw new Error('Usuario no encontrado');
    }

    const now = new Date();
    const daysLeft = profile.planExpiresAt 
      ? Math.ceil((profile.planExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      planType: profile.planType,
      expiresAt: profile.planExpiresAt,
      daysLeft: daysLeft && daysLeft > 0 ? daysLeft : null,
      isExpired: profile.planExpiresAt ? profile.planExpiresAt < now : false
    };
  }

  
}