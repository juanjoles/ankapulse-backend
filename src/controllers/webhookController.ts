import { Request, Response } from 'express';
import { MercadoPagoService } from '../services/mercadoPagoService';
import { PlanService } from '../services/planService';
import prisma from '../models/prisma';

export class WebhookController {
  /**
   * Webhook de Mercado Pago
   * POST /api/webhooks/mercadopago
   */
  static async handleMercadoPago(req: Request, res: Response): Promise<void> {
    console.log('🎯 WEBHOOK INICIADO');
    console.log('📧 Headers:', req.headers);
    console.log('📦 Body:', req.body);
    console.log('📦 Body type:', typeof req.body);
    try {
      const { type, data } = req.body;

      console.log('📨 Webhook recibido de Mercado Pago:', { type, data });

      // MP envía notificaciones de tipo "payment"
      if (type !== 'payment') {
        console.log('⏭️ Tipo de notificación ignorado:', type);
        res.status(200).send('OK');
        return;
      }

      // Obtener ID del pago
      const paymentId = data.id;
      
        if (paymentId === '123456' || paymentId === 'test') {
          console.log('🧪 Webhook de prueba recibido, ignorando...');
          res.status(200).send('OK');
          return;
    }

      if (!paymentId) {
        console.error('❌ Webhook sin payment ID');
        res.status(400).json({ error: 'Payment ID missing' });
        return;
      }

      // Esperar 2 segundos para que MP procese el pago
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Obtener información completa del pago
      const payment = await MercadoPagoService.getPayment(paymentId);
      const paymentInfo = MercadoPagoService.extractPaymentInfo(payment);

      console.log('💳 Información del pago:', {
        id: paymentInfo.id,
        status: paymentInfo.status,
        amount: paymentInfo.transactionAmount,
        metadata: paymentInfo.metadata,
        externalReference: paymentInfo.externalReference,
      });

      // Extraer metadata
      let userId = payment.metadata?.user_id;
      let planType = payment.metadata?.plan_type;

      // Si no hay metadata, intentar extraer del external_reference
      if (!userId || !planType) {
        const externalRef = payment.external_reference;
        console.log('🔄 Metadata vacía, intentando external_reference:', externalRef);
        
        if (externalRef) {
          // Format: "userId-planType-timestamp"
          const parts = externalRef.split('-');
          if (parts.length >= 2) {
            userId = parts[0];
            planType = parts[1];
            console.log('✅ Datos extraídos de external_reference:', { userId, planType });
          }
        }
      }

      if (!userId || !planType) {
        console.error('❌ No se pudo obtener userId/planType ni de metadata ni de external_reference');
        res.status(400).json({ error: 'Cannot identify user or plan type' });
        return;
      }

      // Verificar si el pago ya fue procesado
      const existingPayment = await prisma.payment.findUnique({
        where: { mpPaymentId: paymentId.toString() },
      });

      if (existingPayment) {
        console.log('⏭️ Pago ya procesado anteriormente:', paymentId);
        res.status(200).send('OK - Already processed');
        return;
      }

      // Guardar el pago en la BD
      const paymentRecord = await prisma.payment.create({
        data: {
          userId,
          amount: MercadoPagoService.convertARStoUSD(paymentInfo.transactionAmount),
          currency: 'USD',
          status: paymentInfo.status,
          paymentMethod: paymentInfo.paymentMethodId,
          planType,
          mpPaymentId: paymentId.toString(),
          mpPreferenceId: (payment as any).preference_id || null,
          mpStatus: paymentInfo.status,
          mpStatusDetail: paymentInfo.statusDetail,
          metadata: paymentInfo,
          description: `Plan ${planType} - Pago mensual`,
          paidAt: paymentInfo.status === 'approved' ? new Date(paymentInfo.dateApproved) : null,
        },
      });

      console.log(`💾 Pago guardado en BD: ${paymentRecord.id}`);

      // Si el pago fue aprobado, actualizar el plan del usuario
      if (MercadoPagoService.isPaymentApproved(payment)) {
        console.log(`✅ Pago APROBADO - Actualizando plan a ${planType}`);

        // Calcular fecha de expiración (30 días desde ahora)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // ✨ ACTUALIZACIÓN: Upgrade + reactivar checks automáticamente
        await PlanService.upgradePlan(userId, planType as any);

        // Actualizar profile con fecha de expiración
        await prisma.profile.update({
          where: { userId },
          data: {
            planExpiresAt: expiresAt,
            planStartedAt: new Date(),
          },
        });

        // Crear o actualizar suscripción
        const existingSubscription = await prisma.subscription.findFirst({
          where: {
            userId,
            status: 'active',
          },
        });

        if (existingSubscription) {
          // Actualizar suscripción existente
          await prisma.subscription.update({
            where: { id: existingSubscription.id },
            data: {
              planType,
              nextBillingDate: expiresAt,
              updatedAt: new Date(),
            },
          });
        } else {
          // Crear nueva suscripción
          await prisma.subscription.create({
            data: {
              userId,
              planType,
              status: 'active',
              amount: payment.metadata?.price_usd || MercadoPagoService.convertARStoUSD(paymentInfo.transactionAmount),
              currency: 'USD',
              billingCycle: 'monthly',
              startDate: new Date(),
              nextBillingDate: expiresAt,
            },
          });
        }

        console.log(`🎉 Usuario ${userId} actualizado a plan ${planType} con expiración: ${expiresAt.toLocaleDateString()}`);
      } else {
        console.log(`⚠️ Pago con estado: ${paymentInfo.status} (${paymentInfo.statusDetail})`);
      }

      // Responder a MP que recibimos la notificación
      res.status(200).send('OK');
    } catch (error: any) {
      console.error('❌ ERROR EN WEBHOOK:', error);
      console.error('❌ Stack trace:', error.stack);
      console.error('❌ Error procesando webhook de MP:', error);
      res.status(500).json({
        error: 'Error processing webhook',
        details: error.message,
      });
    }
  }
}