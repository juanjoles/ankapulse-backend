// src/services/mercadopagoService.ts
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { PlanType } from './planService';

// Configurar cliente de Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
  options: {
    timeout: 5000,
  },
});

console.log('🔍 Verificando URLs:');
console.log('- FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('- BACKEND_URL:', process.env.BACKEND_URL);

const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);

// Precios en USD
const PLAN_PRICES_USD: Record<PlanType, number> = {
  free: 0,
  starter: 5,
  pro: 15,
};

// Tipo de cambio (actualizar manualmente o usar API)
const USD_TO_ARS = parseFloat(process.env.USD_TO_ARS_RATE || '1000');

export interface CreatePreferenceInput {
  userId: string;
  userEmail: string;
  planType: 'starter' | 'pro';
}

export class MercadoPagoService {
  /**
   * Crear preferencia de pago para un plan
   */
  static async createPreference(input: CreatePreferenceInput) {
    const { userId, userEmail, planType } = input;

    // Calcular precio en ARS
    const priceUSD = PLAN_PRICES_USD[planType];
    const priceARS = priceUSD * USD_TO_ARS;

    // Descripción del producto
    const title = `AnkaPulse - Plan ${planType === 'starter' ? 'Starter' : 'Pro'}`;
    const description = `Suscripción mensual - Plan ${planType === 'starter' ? 'Starter ($5 USD)' : 'Pro ($15 USD)'}`;

    try {
      console.log('🔄 Creando preferencia en MP:', {
    userId,
    userEmail,
    planType,
    priceARS,
  });
      const preference = await preferenceClient.create({
        body: {
          items: [
            {
              id: planType,
              title: title,
              description: description,
              quantity: 1,
              unit_price: priceARS,
              currency_id: 'ARS',
            },
          ],
          payer: {
            email: userEmail,
          },
          back_urls: {
            success: 'http://localhost:3000/payment/success',
            failure: 'http://localhost:3000/payment/failure',
            pending: 'http://localhost:3000/payment/pending',
          },
          //auto_return: 'approved',
          notification_url: `http://localhost:3000/api/webhooks/mercadopago`,
          // metadata: {
          //   user_id: userId,
          //   plan_type: planType,
          //   price_usd: priceUSD,
          //   price_ars: priceARS,
          // },
          // statement_descriptor: 'AnkaPulse',
          external_reference: `${userId}-${planType}-${Date.now()}`,
        },
      });

      console.log(`✅ Preferencia creada: ${preference.id} para usuario ${userId}`);

      return {
        preferenceId: preference.id,
        initPoint: preference.init_point, // URL de checkout
        sandboxInitPoint: preference.sandbox_init_point, // URL de checkout TEST
      };
    } catch (error: any) {
      console.error('❌ Error creando preferencia de MP:', error);
      console.error('- Mensaje:', error.message);
  console.error('- Status:', error.status);
  console.error('- Causa:', error.cause);
  console.error('- Response:', error.response?.data);
  console.error('- Error completo:', JSON.stringify(error, null, 2));
      throw new Error(`Error al crear preferencia de pago: ${error.message}`);
    }
  }

  /**
   * Obtener información de un pago
   */
  static async getPayment(paymentId: string) {
    try {
      const payment = await paymentClient.get({ id: paymentId });
      return payment;
    } catch (error: any) {
      console.error(`❌ Error obteniendo pago ${paymentId}:`, error);
      throw new Error(`Error al obtener información del pago: ${error.message}`);
    }
  }

  /**
   * Verificar si un pago fue aprobado
   */
  static isPaymentApproved(payment: any): boolean {
    return payment.status === 'approved';
  }

  /**
   * Extraer información relevante del pago
   */
  static extractPaymentInfo(payment: any) {
    return {
      id: payment.id,
      status: payment.status,
      statusDetail: payment.status_detail,
      transactionAmount: payment.transaction_amount,
      currencyId: payment.currency_id,
      paymentMethodId: payment.payment_method_id,
      paymentTypeId: payment.payment_type_id,
      dateCreated: payment.date_created,
      dateApproved: payment.date_approved,
      payer: {
        email: payment.payer?.email,
        identification: payment.payer?.identification,
      },
      metadata: payment.metadata,
      externalReference: payment.external_reference,
    };
  }

  /**
   * Convertir ARS a USD (para guardar en BD)
   */
  static convertARStoUSD(amountARS: number): number {
    return parseFloat((amountARS / USD_TO_ARS).toFixed(2));
  }

  /**
   * Convertir USD a ARS (para mostrar precios)
   */
  static convertUSDtoARS(amountUSD: number): number {
    return Math.round(amountUSD * USD_TO_ARS);
  }

  /**
   * Obtener precios de planes
   */
  static getPlanPrices() {
    return {
      starter: {
        usd: PLAN_PRICES_USD.starter,
        ars: this.convertUSDtoARS(PLAN_PRICES_USD.starter),
      },
      pro: {
        usd: PLAN_PRICES_USD.pro,
        ars: this.convertUSDtoARS(PLAN_PRICES_USD.pro),
      },
    };
  }
}