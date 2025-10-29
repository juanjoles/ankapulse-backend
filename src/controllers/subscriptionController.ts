// src/controllers/subscriptionController.ts
import { Response } from 'express';
import { MercadoPagoService } from '../services/mercadoPagoService';
import { PlanService } from '../services/planService';
import prisma from '../models/prisma';

interface AuthRequest {
  user?: {
    userId: string;
  };
  body: any;
}

export class SubscriptionController {
  
  /**
 * SOLO PARA TESTING - Upgrade manual sin Mercado Pago
 * POST /api/subscriptions/upgrade-test
 */
static async upgradeForTesting(req: any, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { planType } = req.body;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'No autenticado' });
      return;
    }

    if (!planType || !['starter', 'pro'].includes(planType)) {
      res.status(400).json({ status: 'error', message: 'Plan inválido' });
      return;
    }

    // Calcular expiración (30 días)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Actualizar plan
    await PlanService.upgradePlan(userId, planType);

    // Crear subscription
    await prisma.subscription.create({
      data: {
        userId,
        planType,
        status: 'active',
        amount: planType === 'starter' ? 5 : 15,
        currency: 'USD',
        billingCycle: 'monthly',
        startDate: new Date(),
        nextBillingDate: expiresAt,
      },
    });

    // Crear payment de prueba
    await prisma.payment.create({
      data: {
        userId,
        amount: planType === 'starter' ? 5 : 15,
        currency: 'USD',
        status: 'approved',
        planType,
        description: `Plan ${planType} - Testing upgrade`,
        paidAt: new Date(),
      },
    });

    console.log(`✅ [TESTING] Usuario ${userId} actualizado a plan ${planType}`);

    res.status(200).json({
      status: 'success',
      message: `Plan actualizado a ${planType} exitosamente (MODO TESTING)`,
      data: { planType, expiresAt },
    });
  } catch (error: any) {
    console.error('Error en upgrade de testing:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
}
  
    /**
   * Cambiar entre planes de pago (ACTUALIZADO con checks automáticos)
   */
  static async changePlan(req: any, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { planType } = req.body;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Usuario no autenticado',
        });
        return;
      }

      if (!planType || !['starter', 'pro'].includes(planType)) {
        res.status(400).json({
          status: 'error',
          message: 'Plan inválido. Debe ser "starter" o "pro"',
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(404).json({
          status: 'error',
          message: 'Usuario no encontrado',
        });
        return;
      }

      const currentPlan = await PlanService.getUserProfile(userId);

      if (currentPlan.planType === planType) {
        res.status(400).json({
          status: 'error',
          message: `Ya tienes el plan ${planType}`,
        });
        return;
      }

      // Downgrade PRO → STARTER (cambio directo)
      if (currentPlan.planType === 'pro' && planType === 'starter') {
        console.log(`📉 Downgrade directo: PRO → STARTER para usuario ${userId}`);
        
        // Actualizar plan y checks automáticamente
        await PlanService.upgradePlan(userId, planType);
        await PlanService.updateChecksIntervals(userId, planType);

        // Actualizar suscripción
        await prisma.subscription.updateMany({
          where: { userId, status: 'active' },
          data: {
            planType,
            amount: 5,
            updatedAt: new Date(),
          },
        });

        res.status(200).json({
          status: 'success',
          message: 'Plan cambiado a Starter. Los checks con intervalo de 1 minuto se actualizaron a 5 minutos automáticamente.',
          data: { 
            planType: 'starter', 
            directChange: true,
            success: true
          },
        });
        return;
      }

      // Para otros casos (upgrade STARTER → PRO), crear preferencia de pago
      const preference = await MercadoPagoService.createPreference({
        userId: user.id,
        userEmail: user.email,
        planType,
      });

      const prices = MercadoPagoService.getPlanPrices();
      const planPrices = planType === 'starter' ? prices.starter : prices.pro;

      res.status(200).json({
        status: 'success',
        message: 'Preferencia de pago creada para cambio de plan',
        data: {
          preferenceId: preference.preferenceId,
          checkoutUrl: preference.sandboxInitPoint || preference.initPoint,
          planType,
          prices: planPrices,
        },
      });

    } catch (error: any) {
      console.error('❌ Error cambiando plan:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al cambiar plan',
        details: error.message,
      });
    }
  }

  /**
   * Downgrade a plan FREE (ACTUALIZADO)
   */
  static async downgradeToFree(req: any, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Usuario no autenticado',
        });
        return;
      }

      console.log(`📉 Downgrade a FREE para usuario ${userId}`);

      // Cancelar suscripción activa
      await prisma.subscription.updateMany({
        where: { userId, status: 'active' },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
        },
      });

      // Downgrade completo (perfil + checks + intervalos)
      await PlanService.downgradeToFree(userId);

      res.status(200).json({
        status: 'success',
        message: 'Plan cambiado a FREE. Los intervalos se actualizaron a 30 minutos y se pausaron checks extras si superaban el límite de 10.',
        data: { 
          planType: 'free',
          checksUpdated: true
        },
      });

    } catch (error: any) {
      console.error('❌ Error en downgrade:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al cambiar a plan FREE',
        details: error.message,
      });
    }
  }
  
  /**
   * Crear preferencia de pago (iniciar proceso de upgrade)
   * POST /api/subscriptions/create-preference
   */
  static async createPreference(req: any, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { planType } = req.body;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Usuario no autenticado',
        });
        return;
      }

      // Validar planType
      if (!planType || !['starter', 'pro'].includes(planType)) {
        res.status(400).json({
          status: 'error',
          message: 'Plan inválido. Debe ser "starter" o "pro"',
        });
        return;
      }

      // Obtener usuario y plan actual
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(404).json({
          status: 'error',
          message: 'Usuario no encontrado',
        });
        return;
      }

      const currentPlan = await PlanService.getUserProfile(userId);

      // Validar que no esté tratando de comprar un plan menor o igual
      const planHierarchy: Record<string, number> = { free: 0, starter: 1, pro: 2 };
      const currentPlanLevel = planHierarchy[currentPlan.planType] || 0;
      const targetPlanLevel = planHierarchy[planType] || 0;
      
      if (targetPlanLevel <= currentPlanLevel) {
        res.status(400).json({
          status: 'error',
          message: `Ya tienes el plan ${currentPlan.planType}. No puedes downgrade o comprar el mismo plan.`,
        });
        return;
      }

      // Crear preferencia en Mercado Pago
      const preference = await MercadoPagoService.createPreference({
        userId: user.id,
        userEmail: user.email,
        planType,
      });

      console.log(`🔗 Preferencia creada para ${user.email} → Plan ${planType}`);

      const prices = MercadoPagoService.getPlanPrices();
      const planPrices = planType === 'starter' ? prices.starter : prices.pro;

      res.status(200).json({
        status: 'success',
        message: 'Preferencia de pago creada',
        data: {
          preferenceId: preference.preferenceId,
          checkoutUrl: process.env.NODE_ENV === 'production' 
            ? preference.initPoint 
            : preference.sandboxInitPoint,
          planType,
          prices: planPrices,
        },
      });
    } catch (error: any) {
      console.error('❌ Error creando preferencia:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al crear preferencia de pago',
        details: error.message,
      });
    }
  }

  /**
   * Obtener suscripción actual del usuario
   * GET /api/subscriptions/current
   */
  static async getCurrentSubscription(req: any, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Usuario no autenticado',
        });
        return;
      }

      // Obtener profile actual
      const profile = await PlanService.getUserProfile(userId);

      // Obtener suscripción activa (si existe)
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: 'active',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Obtener uso del plan
      const usage = await PlanService.getPlanUsage(userId);

      res.status(200).json({
        status: 'success',
        data: {
          profile,
          subscription,
          usage,
          prices: MercadoPagoService.getPlanPrices(),
        },
      });
    } catch (error: any) {
      console.error('❌ Error obteniendo suscripción:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al obtener información de suscripción',
        details: error.message,
      });
    }
  }

  /**
   * Obtener historial de pagos del usuario
   * GET /api/subscriptions/payments
   */
  static async getPaymentHistory(req: any, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Usuario no autenticado',
        });
        return;
      }

      const payments = await prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      res.status(200).json({
        status: 'success',
        data: { payments },
      });
    } catch (error: any) {
      console.error('❌ Error obteniendo historial:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al obtener historial de pagos',
        details: error.message,
      });
    }
  }

  /**
   * Cancelar suscripción (downgrade a FREE)
   * POST /api/subscriptions/cancel
   */
  static async cancelSubscription(req: any, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Usuario no autenticado',
        });
        return;
      }

      // Marcar suscripción como cancelada
      await prisma.subscription.updateMany({
        where: {
          userId,
          status: 'active',
        },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
        },
      });

      // Downgrade a FREE
      await PlanService.downgradeToFree(userId);

      console.log(`⚠️ Suscripción cancelada para usuario ${userId}`);

      res.status(200).json({
        status: 'success',
        message: 'Suscripción cancelada. Has sido movido al plan FREE.',
      });
    } catch (error: any) {
      console.error('❌ Error cancelando suscripción:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al cancelar suscripción',
        details: error.message,
      });
    }
  }
}