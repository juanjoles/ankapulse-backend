import express from 'express';
import { TelegramController } from '../controllers/telegramController';

const router = express.Router();

// Webhook de Telegram (sin autenticación para recibir de Telegram)
router.post('/webhook', TelegramController.handleWebhook);

// Información del webhook (con autenticación si quieres)
router.get('/webhook-info', TelegramController.getWebhookInfo);

// Health check
router.get('/health', TelegramController.healthCheck);

export default router;