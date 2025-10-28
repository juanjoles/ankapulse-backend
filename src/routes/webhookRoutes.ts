// src/routes/webhookRoutes.ts
import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';

const router = Router();

// POST /api/webhooks/mercadopago - Webhook de Mercado Pago
// IMPORTANTE: Sin authMiddleware porque MP envía sin token
router.post('/mercadopago', WebhookController.handleMercadoPago);

export default router;