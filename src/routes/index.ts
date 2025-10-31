import { Router } from 'express';
import userRoutes from './userRoutes';
import authRoutes from './authRoutes';
import auth0Routes from './auth0Routes';
import checkRoutes from './checks.routes';
import subscriptionRoutes from './subscriptionRoutes';
import webhookRoutes from './webhookRoutes';
import alertRoutes from './alertsRoutes';
import telegramRoutes from './telegramRoutes';

const router = Router();


// Rutas de usuarios
router.use('/users', userRoutes);

// Rutas de autenticación tradicional
router.use('/auth', authRoutes);

// Rutas de checks
router.use('/checks', checkRoutes);

router.use('/subscriptions', subscriptionRoutes);

router.use('/webhooks', webhookRoutes);

router.use('/alerts', alertRoutes);

router.use('/telegram', telegramRoutes);

export default router;

// IMPORTANTE: Las rutas Auth0 van en el app.ts principal para evitar conflicto de prefijos