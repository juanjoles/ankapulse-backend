// src/routes/webhookRoutes.ts
import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';
import { SubscriptionController } from '../controllers/subscriptionController';

const router = Router();

// POST /api/webhooks/mercadopago - Webhook de Mercado Pago
// IMPORTANTE: Sin authMiddleware porque MP envía sin token
router.post('/mercadopago', WebhookController.handleMercadoPago);

// POST /api/webhooks/lemon-squeezy - Webhook de Lemon Squeezy
// IMPORTANTE: Sin authMiddleware porque Lemon Squeezy envía sin token
router.post('/lemon-squeezy', SubscriptionController.handleLemonWebhook);

export default router;