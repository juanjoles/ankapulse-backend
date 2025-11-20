// src/routes/subscriptionRoutes.ts
import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscriptionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// POST /api/subscriptions/create-preference - Crear preferencia de pago
router.post('/create-preference', authenticateToken, SubscriptionController.createPreference);

// POST /api/subscriptions/change-plan - Cambiar entre planes de pago
router.post('/change-plan', authenticateToken, SubscriptionController.changePlan);

// POST /api/subscriptions/downgrade - Downgrade a FREE
router.post('/downgrade', authenticateToken, SubscriptionController.downgradeToFree);

// POST /api/subscriptions/cancel - Cancelar suscripción
router.post('/cancel', authenticateToken, SubscriptionController.cancelSubscription);


// GET /api/subscriptions/current - Obtener suscripción actual
router.get('/current', authenticateToken, SubscriptionController.getCurrentSubscription);

// GET /api/subscriptions/payments - Historial de pagos
router.get('/payments', authenticateToken, SubscriptionController.getPaymentHistory);

// POST /api/subscriptions/lemon/create-checkout - Crear checkout con Lemon Squeezy
router.post('/lemon/create-checkout', authenticateToken, SubscriptionController.createLemonCheckout);

router.post('/lemon/change-plan', authenticateToken, SubscriptionController.changeLemonPlan);

// POST /api/subscriptions/cancel - Cancelar suscripción

// RUTA DE TESTING - Quitar en producción
router.post('/upgrade-test', authenticateToken, SubscriptionController.upgradeForTesting);

export default router;