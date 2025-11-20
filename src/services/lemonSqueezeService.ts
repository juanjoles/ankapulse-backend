// src/services/lemonSqueezyService.ts
import { 
  lemonSqueezySetup,
  createCheckout,
  getSubscription,
  updateSubscription,
  cancelSubscription as lsCancel
} from '@lemonsqueezy/lemonsqueezy.js';

// Configurar Lemon Squeezy
lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY!,
});

const STORE_ID = Number(process.env.LEMONSQUEEZY_STORE_ID!);
const VARIANT_IDS = {
  starter: Number(process.env.LEMONSQUEEZY_VARIANT_STARTER_ID!), 
  pro: Number(process.env.LEMONSQUEEZY_VARIANT_PRO_ID!), 
};

export class LemonSqueezyService {
  /**
   * Crear checkout para un plan
   */
  static async createCheckout(userId: string, planType: 'starter' | 'pro', email: string) {
    try {
      const variantId = VARIANT_IDS[planType];

      console.log('🍋 Creando checkout en Lemon Squeezy:', {
        storeId: STORE_ID,
        variantId,
        planType,
        email,
        userId
      });

      const checkout = await createCheckout(STORE_ID, variantId, {
        checkoutData: {
          email,
          custom: {
            user_id: userId,
          },
        },
        // productOptions: {
        //   enabledVariants: [productId],
        // },
        checkoutOptions: {
          embed: false,
          media: true,
          logo: true,
        },
      });


      if (!checkout.data) {
        throw new Error('No se pudo crear el checkout');
      }

      console.log('✅ Checkout creado:', checkout.data.data.attributes.url);

      return {
        checkoutUrl: checkout.data.data.attributes.url,
        checkoutId: checkout.data.data.id,
      };
    } catch (error) {
      console.error('❌ Error creando checkout en Lemon Squeezy:', error);
      throw error;
    }
  }

  /**
   * Obtener suscripción por ID
   */
  static async getSubscription(subscriptionId: string) {
    try {
      const subscription = await getSubscription(subscriptionId);
      return subscription.data?.data;
    } catch (error) {
      console.error('❌ Error obteniendo suscripción:', error);
      throw error;
    }
  }

  /**
   * Actualizar suscripción (cambiar plan)
   */
  static async updateSubscription(
    subscriptionId: string,
    newProductId: number // ← Ya es número
  ) {
    try {
      const updated = await updateSubscription(subscriptionId, {
        variantId: newProductId,
      });
      return updated.data?.data;
    } catch (error) {
      console.error('❌ Error actualizando suscripción:', error);
      throw error;
    }
  }

  /**
   * Cancelar suscripción
   */
  static async cancelSubscription(subscriptionId: string) {
    try {
      const cancelled = await lsCancel(subscriptionId);
      return cancelled.data?.data;
    } catch (error) {
      console.error('❌ Error cancelando suscripción:', error);
      throw error;
    }
  }
}