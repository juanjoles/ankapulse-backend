// src/services/planService.ts
import prisma from '../models/prisma';

import { SchedulerService } from './scheduler.service';


// Tipos de planes disponibles
export type PlanType = 'free' | 'starter' | 'pro';

// Configuración de cada plan
export interface PlanConfig {
  name: string;
  price: number; // USD
  maxChecks: number;
  minIntervalMinutes: number;
  maxRegions: number;
  dataRetentionDays: number;
  alertCooldownMin: number;
  features: string[];
}

// Definición de planes (SINGLE SOURCE OF TRUTH)
export const PLANS: Record<PlanType, PlanConfig> = {
  free: {
    name: 'Free',
    price: 0,
    maxChecks: 10,
    minIntervalMinutes: 30,
    maxRegions: 1,
    dataRetentionDays: 7,
    alertCooldownMin: 30,
    features: [
      '10 checks',
      '30 min interval',
      'Email alerts',
      '7 days retention',
    ],
  },
  starter: {
    name: 'Starter',
    price: 5,
    maxChecks: 50,
    minIntervalMinutes: 1,
    maxRegions: 3,
    dataRetentionDays: 30,
    alertCooldownMin: 15,
    features: [
      '50 checks',
      '1 min interval',
      'Email alerts',
      'Telegram alerts',
      '30 days retention',
      '15 min alert cooldown',
    ],
  },
  pro: {
    name: 'Pro',
    price: 15,
    maxChecks: 200,
    minIntervalMinutes: 1,
    maxRegions: 1,
    dataRetentionDays: 90,
    alertCooldownMin: 0, // Sin cooldown = notificación inmediata
    features: [
      '25 checks',
      '1 min interval',
      'Email alerts',
      'Telegram alerts',
      '90 days retention',
      'Immediate notifications',
    ],
  },
};

export class PlanService {
  /**
   * Obtener la configuración de un plan
   */
  static getPlanConfig(planType: PlanType): PlanConfig {
    return PLANS[planType];
  }

  /**
   * Obtener todos los planes disponibles (para mostrar en pricing page)
   */
  static getAllPlans(): Record<PlanType, PlanConfig> {
    return PLANS;
  }

  /**
   * Obtener el profile (plan actual) de un usuario
   */
  static async getUserProfile(userId: string) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new Error('Profile no encontrado');
    }

    return profile;
  }

  /**
   * Obtener el plan actual del usuario con su configuración
   */
  static async getUserPlan(userId: string) {
    const profile = await this.getUserProfile(userId);
    const config = this.getPlanConfig(profile.planType as PlanType);

    return {
      profile,
      config,
    };
  }

  /**
   * Validar si el usuario puede crear más checks
   */
  static async canCreateCheck(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    current: number;
    limit: number;
  }> {
    const profile = await this.getUserProfile(userId);

    const currentChecks = await prisma.check.count({
      where: {
        userId,
        status: 'active', // Solo contar checks activos
      },
    });

    const allowed = currentChecks < profile.maxChecks;

    return {
      allowed,
      reason: allowed ? undefined : `Has alcanzado el límite de ${profile.maxChecks} checks de tu plan ${profile.planType}`,
      current: currentChecks,
      limit: profile.maxChecks,
    };
  }

  /**
   * Validar si un intervalo es permitido para el plan del usuario
   */
  static async isIntervalAllowed(
    userId: string,
    intervalString: string
  ): Promise<{
    allowed: boolean;
    reason?: string;
    minAllowed: number;
  }> {
    const profile = await this.getUserProfile(userId);

    // Convertir string de intervalo a minutos
    const intervalMinutes = this.parseIntervalToMinutes(intervalString);

    const allowed = intervalMinutes >= profile.minIntervalMinutes;

    return {
      allowed,
      reason: allowed
        ? undefined
        : `Tu plan ${profile.planType} requiere un intervalo mínimo de ${profile.minIntervalMinutes} minutos`,
      minAllowed: profile.minIntervalMinutes,
    };
  }

  /**
   * Upgrade plan (ACTUALIZADO)
   */
  static async upgradePlan(userId: string, planType: string, durationDays: number = 30): Promise<void> {
    try {
      console.log(`📈 Upgrading usuario ${userId} a ${planType}`);

      const planConfigs: { [key: string]: any } = {
        starter: {
          maxChecks: 50,
          minIntervalMinutes: 1,
          maxRegions: 3,
          dataRetentionDays: 30,
        },
        pro: {
          maxChecks: 200,
          minIntervalMinutes: 1,
          maxRegions: 10,
          dataRetentionDays: 90,
        },
      };

      const config = planConfigs[planType];
      if (!config) {
        throw new Error(`Plan ${planType} no válido`);
      }
      const expirationDate = new Date(Date.now() + (durationDays * 24 * 60 * 60 * 1000));
      // 1. Actualizar perfil
      await prisma.profile.update({
        where: { userId },
        data: {
          planType,
          maxChecks: config.maxChecks,
          minIntervalMinutes: config.minIntervalMinutes,
          maxRegions: config.maxRegions,
          dataRetentionDays: config.dataRetentionDays,
          planStartedAt: new Date(),
          planExpiresAt: expirationDate,
        },
      });

      // 2. Reactivar checks pausados
      await this.reactivatePausedChecks(userId);

      // 3. Los intervalos se mantienen (no se reducen automáticamente)
      // El usuario puede cambiarlos manualmente si quiere mayor frecuencia

      console.log(`✅ Upgrade a ${planType} completado`);

    } catch (error) {
      console.error(`❌ Error en upgrade a ${planType}:`, error);
      throw error;
    }
  }
  /**
   * Contar checks activos del usuario
   */
  static async getUserChecksCount(userId: string): Promise<number> {
    try {
      const count = await prisma.check.count({
        where: { 
          userId,
          status: { not: 'deleted' } // Excluir checks eliminados
        }
      });

      return count;
    } catch (error) {
      console.error('Error contando checks del usuario:', error);
      return 0;
    }
  }

  /**
   * Downgrade a plan FREE (ACTUALIZADO)
   */
  static async downgradeToFree(userId: string): Promise<void> {
    try {
      console.log(`📉 Downgrading usuario ${userId} a FREE`);

      // 1. Actualizar perfil a FREE
      await prisma.profile.update({
        where: { userId },
        data: {
          planType: 'free',
          maxChecks: 10,
          minIntervalMinutes: 30,
          maxRegions: 1,
          dataRetentionDays: 7,
          planStartedAt: new Date(),
          planExpiresAt: null, 
          telegramAlertsEnabled: false, 
        },
      });

      // 2. Actualizar intervalos de checks a 30min
      await this.updateChecksIntervals(userId, 'free');

      // 3. Pausar checks extras (límite 10)
      await this.pauseExtraChecks(userId, 10);

      console.log(`✅ Downgrade a FREE completado`);

    } catch (error) {
      console.error('❌ Error en downgrade a FREE:', error);
      throw error;
    }
  }

  /**
   * Actualizar contador de checks actuales
   */
  static async updateCheckCount(userId: string) {
    const count = await prisma.check.count({
      where: {
        userId,
        status: 'active',
      },
    });

    await prisma.profile.update({
      where: { userId },
      data: { currentChecks: count },
    });

    return count;
  }

  /**
   * Helper: Convertir string de intervalo a minutos
   */
  private static parseIntervalToMinutes(intervalString: string): number {
    const mapping: Record<string, number> = {
      '1min': 1,
      '5min': 5,
      '15min': 15,
      '30min': 30,
      '1h': 60,
      '1hour': 60,
      '1d': 1440,
      '1day': 1440,
    };

    return mapping[intervalString.toLowerCase()] || 60;
  }

  /**
   * Helper: Convertir minutos a string legible
   */
  static formatInterval(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    if (minutes === 60) return '1 hour';
    if (minutes === 1440) return '1 day';
    return `${minutes} min`;
  }

  /**
   * Obtener estadísticas de uso del plan
   */
  static async getPlanUsage(userId: string) {
    const profile = await this.getUserProfile(userId);
    const config = this.getPlanConfig(profile.planType as PlanType);

    const activeChecks = await prisma.check.count({
      where: { userId, status: 'active' },
    });

    const checksUsagePercent = (activeChecks / profile.maxChecks) * 100;

    return {
      plan: {
        type: profile.planType,
        name: config.name,
        price: config.price,
      },
      usage: {
        checks: {
          current: activeChecks,
          limit: config.maxChecks,
          percentage: Math.round(checksUsagePercent),
        },
        dataRetention: {
          days: config.dataRetentionDays,
        },
        minInterval: {
          minutes: config.minIntervalMinutes,
          formatted: this.formatInterval(config.minIntervalMinutes),
        },
      },
      expiration: {
        expiresAt: profile.planExpiresAt,
        isExpired: profile.planExpiresAt
          ? new Date() > profile.planExpiresAt
          : false,
      },
    };
  }
  
    /**
   * Actualizar intervalos de checks automáticamente cuando cambia de plan
   */
  static async updateChecksIntervals(userId: string, newPlanType: string): Promise<void> {
    try {
      console.log(`🔄 Actualizando intervalos de checks para plan: ${newPlanType}`);

      // Definir intervalos mínimos por plan
      const minIntervals: { [key: string]: string } = {
        'free': '30min',
        'starter': '1min', 
        'pro': '1min'
      };

      // Jerarquía de intervalos (de menor a mayor frecuencia)
      const intervalHierarchy = ['30min', '15min', '5min', '1min'];
      
      const newMinInterval = minIntervals[newPlanType];
      const newMinIntervalIndex = intervalHierarchy.indexOf(newMinInterval);

      // Obtener todos los checks activos del usuario
      const userChecks = await prisma.check.findMany({
        where: { 
          userId,
          status: 'active' // Solo checks activos
        },
        select: { 
          id: true, 
          interval: true, 
          name: true, 
          url: true 
        }
      });

      console.log(`📋 Encontrados ${userChecks.length} checks activos para revisar`);

      let updatedCount = 0;

      // Actualizar checks que tienen intervalos no permitidos
      for (const check of userChecks) {
        const currentIntervalIndex = intervalHierarchy.indexOf(check.interval);
        
        // Si el intervalo actual es más frecuente que el permitido
        if (currentIntervalIndex > newMinIntervalIndex) {
          console.log(`⚠️ Check "${check.name || check.url}" tiene intervalo ${check.interval}, cambiando a ${newMinInterval}`);
          
          await prisma.check.update({
            where: { id: check.id },
            data: { 
              interval: newMinInterval,
              updatedAt: new Date()
            }
          });

          updatedCount++;
          console.log(`✅ Check actualizado: ${check.interval} → ${newMinInterval}`);
        }
      }

      console.log(`✅ ${updatedCount} checks actualizados para plan ${newPlanType}`);

      return;

    } catch (error) {
      console.error('❌ Error actualizando intervalos de checks:', error);
      throw error;
    }
  }

  /**
   * Pausar checks extras cuando se downgrade a FREE
   */
  static async pauseExtraChecks(userId: string, maxChecks: number): Promise<void> {
    try {
      const totalChecks = await prisma.check.count({
        where: { userId }
      });

      if (totalChecks > maxChecks) {
        console.log(`⚠️ Usuario tiene ${totalChecks} checks, límite del plan: ${maxChecks}`);
        
        // Obtener los checks más recientes para mantener activos
        const checksToKeep = await prisma.check.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: maxChecks,
          select: { id: true }
        });

        const keepIds = checksToKeep.map(c => c.id);


        // Obtener los checks que se van a pausar
      const checksToPause = await prisma.check.findMany({
        where: {
          userId,
          id: { notIn: keepIds }
        },
        select: { id: true }
      });

        // Pausar los checks extras
        const pausedChecks = await prisma.check.updateMany({
          where: {
            userId,
            id: { notIn: keepIds }
          },
          data: { 
            status: 'paused',
            updatedAt: new Date()
          }
        });

        const scheduler = new SchedulerService();
      for (const check of checksToPause) {
        await scheduler.removeCheck(check.id);
      }

        console.log(`⏸️ ${pausedChecks.count} checks pausados debido al límite del plan`);
      }
    } catch (error) {
      console.error('❌ Error pausando checks extras:', error);
      throw error;
    }
  }

  /**
   * Reactivar checks pausados cuando se hace upgrade
   */
  static async reactivatePausedChecks(userId: string): Promise<void> {
    try {
      const reactivatedChecks = await prisma.check.updateMany({
        where: {
          userId,
          status: 'paused'
        },
        data: { 
          status: 'active',
          updatedAt: new Date()
        }
      });

      if (reactivatedChecks.count > 0) {
        console.log(`🔄 ${reactivatedChecks.count} checks reactivados tras upgrade`);
      }
    } catch (error) {
      console.error('❌ Error reactivando checks:', error);
      throw error;
    }
  }
}