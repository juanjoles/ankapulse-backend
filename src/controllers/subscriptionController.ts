// src/controllers/subscriptionController.ts
import { Response } from 'express';
import { MercadoPagoService } from '../services/mercadoPagoService';
import { LemonSqueezyService } from '../services/lemonSqueezeService';
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

      const isProduction = process.env.NODE_ENV === 'production';
      const checkoutUrl = isProduction 
        ? preference.initPoint 
        : preference.sandboxInitPoint;

      const prices = MercadoPagoService.getPlanPrices();
      const planPrices = planType === 'starter' ? prices.starter : prices.pro;

      res.status(200).json({
        status: 'success',
        message: 'Preferencia de pago creada para cambio de plan',
        data: {
          preferenceId: preference.preferenceId,
          checkoutUrl: checkoutUrl,  // ✅ URL corregida
          planType,
          prices: planPrices,
          environment: process.env.NODE_ENV, // Para debugging
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

      const isProduction = process.env.NODE_ENV === 'production';
      const checkoutUrl = isProduction 
        ? preference.initPoint          // ✅ Producción: usar initPoint
        : preference.sandboxInitPoint;  // ✅ Desarrollo: usar sandboxInitPoint

      res.status(200).json({
        status: 'success',
        message: 'Preferencia de pago creada',
        data: {
          preferenceId: preference.preferenceId,
          checkoutUrl: checkoutUrl,  // ✅ URL corregida
          planType,
          prices: planPrices,
          environment: process.env.NODE_ENV, // Para debugging
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

// ============================================
// 🍋 LEMON SQUEEZY ENDPOINTS
// ============================================

/**
 * Crear checkout con Lemon Squeezy
 * POST /api/subscriptions/lemon/create-checkout
 */
static async createLemonCheckout(req: any, res: Response): Promise<void> {
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

    // Obtener usuario
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

    // Validar que sea un upgrade
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

    // Crear checkout en Lemon Squeezy
    const checkout = await LemonSqueezyService.createCheckout(
      userId,
      planType,
      user.email
    );

    console.log(`🍋 Checkout creado para ${user.email} → Plan ${planType}`);

    res.status(200).json({
      status: 'success',
      message: 'Checkout creado con Lemon Squeezy',
      data: {
        checkoutUrl: checkout.checkoutUrl,
        checkoutId: checkout.checkoutId,
        planType,
        provider: 'lemon_squeezy',
        price: planType === 'starter' ? 5 : 15,
      },
    });
  } catch (error: any) {
    console.error('❌ Error creando checkout en Lemon Squeezy:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al crear checkout',
      details: error.message,
    });
  }
}

/**
 * Webhook de Lemon Squeezy
 * POST /api/webhooks/lemon-squeezy
 */
static async handleLemonWebhook(req: any, res: Response): Promise<void> {
  try {
    // TODO: Implementar verificación de firma
    const event = req.body;

    console.log('🍋 Webhook recibido:', event.meta?.event_name);

    // Manejar diferentes tipos de eventos
    switch (event.meta?.event_name) {
      case 'order_created':
        await SubscriptionController.handleOrderCreated(event);
        break;
      
      case 'subscription_created':
        await SubscriptionController.handleSubscriptionCreated(event);
        break;
      
      case 'subscription_updated':
        await SubscriptionController.handleSubscriptionUpdated(event);
        break;
      
      case 'subscription_cancelled':
        await SubscriptionController.handleSubscriptionCancelled(event);
        break;

      case 'subscription_payment_failed': 
        await SubscriptionController.handleSubscriptionPaymentFailed(event);
        break;
      
      case 'subscription_expired': 
        await SubscriptionController.handleSubscriptionExpired(event);
        break;
      
      default:
        console.log(`⚠️ Evento no manejado: ${event.meta?.event_name}`);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('❌ Error en webhook de Lemon Squeezy:', error);
    res.status(500).json({ error: error.message });
  }
}

// Handlers de eventos de Lemon Squeezy
private static async handleOrderCreated(event: any): Promise<void> {
  console.log('📦 Orden creada:', event.data.id);
  // Aquí podrías registrar el pago inicial si lo necesitas
}

private static async handleSubscriptionCreated(event: any): Promise<void> {
  try {
    const subscriptionData = event.data.attributes;
    
    // Obtener user_id del webhook
    const userId = subscriptionData.user_id 
      || subscriptionData.custom_data?.user_id
      || event.meta?.custom_data?.user_id;
    
    if (!userId) {
      console.error('❌ No se encontró user_id en el webhook de Lemon Squeezy');
      return;
    }

    // Determinar plan según el variant_id
    const variantId = subscriptionData.variant_id;
    const planType = variantId === Number(process.env.LEMONSQUEEZY_VARIANT_STARTER_ID) 
      ? 'starter' 
      : 'pro';

    console.log(`🍋 Procesando suscripción para usuario ${userId} → Plan ${planType}`);

    // Upgrade del plan
    await PlanService.upgradePlan(userId, planType);

    // Crear registro de subscription
    await prisma.subscription.create({
      data: {
        userId,
        planType,
        status: 'active',
        amount: planType === 'starter' ? 5 : 15,
        currency: 'USD',
        billingCycle: 'monthly',
        startDate: new Date(),
        nextBillingDate: new Date(subscriptionData.renews_at),
        lsSubscriptionId: event.data.id,
        provider: 'lemon_squeezy',
      },
    });

    // Crear registro de pago
    await prisma.payment.create({
      data: {
        userId,
        amount: planType === 'starter' ? 5 : 15,
        currency: 'USD',
        status: 'approved',
        planType,
        description: `Plan ${planType} - Lemon Squeezy`,
        lsOrderId: subscriptionData.order_id.toString(),
        provider: 'lemon_squeezy',
        paidAt: new Date(),
      },
    });

    console.log(`✅ Usuario ${userId} actualizado exitosamente a plan ${planType}`);
  } catch (error) {
    console.error('❌ Error procesando subscription_created:', error);
  }
}

private static async handleSubscriptionUpdated(event: any): Promise<void> {
  console.log('🔄 Suscripción actualizada:', event.data.id);
  // Manejar cambios de plan si es necesario
}

private static async handleSubscriptionCancelled(event: any): Promise<void> {
  try {
    const lsSubscriptionId = event.data.id;

    // Buscar subscription por lsSubscriptionId
    const subscription = await prisma.subscription.findFirst({
      where: { lsSubscriptionId }, // ← ACTUALIZADO
    });

    if (!subscription) {
      console.error('❌ Subscription no encontrada:', lsSubscriptionId);
      return;
    }

    console.log(`❌ Suscripción cancelada para usuario ${subscription.userId}`);

    // Marcar como cancelada
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    // Downgrade a FREE
    await PlanService.downgradeToFree(subscription.userId);
  } catch (error) {
    console.error('❌ Error manejando subscription_cancelled:', error);
  }
}

private static async handleSubscriptionPaymentFailed(event: any): Promise<void> {
  try {
    const lsSubscriptionId = event.data.id;

    const subscription = await prisma.subscription.findFirst({
      where: { lsSubscriptionId },
    });

    if (!subscription) {
      console.error('❌ Subscription no encontrada:', lsSubscriptionId);
      return;
    }

    console.log(`⚠️ Pago falló para usuario ${subscription.userId}`);

    // Marcar como fallida
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'payment_failed',
        updatedAt: new Date(),
      },
    });

    // Lemon Squeezy reintenta automáticamente varias veces
    // Si todos los intentos fallan, enviará subscription_cancelled automáticamente
    // y ahí sí hacemos el downgrade
    
    console.log(`⏳ Esperando reintentos automáticos de Lemon Squeezy`);
  } catch (error) {
    console.error('❌ Error manejando payment_failed:', error);
  }
}

private static async handleSubscriptionExpired(event: any): Promise<void> {
  try {
    const lsSubscriptionId = event.data.id;

    const subscription = await prisma.subscription.findFirst({
      where: { lsSubscriptionId },
    });

    if (!subscription) {
      console.error('❌ Subscription no encontrada:', lsSubscriptionId);
      return;
    }

    console.log(`⏰ Suscripción expirada para usuario ${subscription.userId}`);

    // Marcar como expirada
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'expired',
        endDate: new Date(),
      },
    });

    // ✅ DOWNGRADE A FREE
    await PlanService.downgradeToFree(subscription.userId);
    
    console.log(`✅ Usuario ${subscription.userId} downgradeado a FREE por expiración`);
  } catch (error) {
    console.error('❌ Error manejando subscription_expired:', error);
  }
}

/**
 * Cambiar plan con Lemon Squeezy (sin checkout)
 * POST /api/subscriptions/lemon/change-plan
 */
static async changeLemonPlan(req: any, res: Response): Promise<void> {
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
        message: 'Plan inválido',
      });
      return;
    }

    // Obtener suscripción activa de Lemon Squeezy
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        provider: 'lemon_squeezy',
        status: 'active',
      },
    });

    if (!subscription || !subscription.lsSubscriptionId) {
      res.status(404).json({
        status: 'error',
        message: 'No se encontró suscripción activa de Lemon Squeezy',
      });
      return;
    }

    const currentPlan = await PlanService.getUserProfile(userId);
    const currentPlanPrice = currentPlan.planType === 'starter' ? 5 : 15;
    const targetPlanPrice = planType === 'starter' ? 5 : 15;

    // Si es downgrade (PRO → STARTER)
    if (targetPlanPrice < currentPlanPrice) {
      console.log(`📉 Downgrade directo: ${currentPlan.planType.toUpperCase()} → ${planType.toUpperCase()}`);
      
      // Obtener el variant ID del nuevo plan
      const newVariantId = planType === 'starter' 
        ? Number(process.env.LEMONSQUEEZY_VARIANT_STARTER_ID)
        : Number(process.env.LEMONSQUEEZY_VARIANT_PRO_ID);

      // Actualizar suscripción en Lemon Squeezy
      await LemonSqueezyService.updateSubscription(
        subscription.lsSubscriptionId,
        newVariantId
      );

      // Actualizar en la BD
      await PlanService.upgradePlan(userId, planType);
      await PlanService.updateChecksIntervals(userId, planType);

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          planType,
          amount: targetPlanPrice,
          updatedAt: new Date(),
        },
      });

      res.status(200).json({
        status: 'success',
        message: `Plan cambiado a ${planType}. Los checks con intervalo incompatible se actualizaron automáticamente.`,
        data: { planType, directChange: true },
      });
      return;
    }

    // Si es upgrade (STARTER → PRO), debe pasar por checkout
    res.status(400).json({
      status: 'error',
      message: 'Para upgrades, usar el endpoint de crear checkout',
    });

  } catch (error: any) {
    console.error('❌ Error cambiando plan con Lemon Squeezy:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al cambiar plan',
      details: error.message,
    });
  }
}


}