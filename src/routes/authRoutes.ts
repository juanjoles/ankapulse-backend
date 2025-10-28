// src/routes/authRoutes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { Auth0Controller } from '../controllers/auth0Controller';

const router = Router();

/**
 * ============================================
 * AUTENTICACIÓN LOCAL (Email/Password)
 * ============================================
 */

// POST /api/auth/register
// Body: { email, nombre, password }
// Crear nueva cuenta con email y contraseña
router.post('/register', AuthController.register);

// POST /api/auth/login
// Body: { email, password }
// Iniciar sesión con credenciales locales
router.post('/login', AuthController.login);

/**
 * ============================================
 * AUTENTICACIÓN OAUTH (Google/GitHub vía Auth0)
 * ============================================
 */


// Si tienes más endpoints de Auth0, agrégalos aquí:
// router.get('/auth0/authorize', Auth0Controller.authorize);
// router.post('/auth0/token', Auth0Controller.token);

/**
 * ============================================
 * FUTURO: Otras rutas de autenticación
 * ============================================
 * 
 * POST /api/auth/logout (blacklist de tokens)
 * POST /api/auth/refresh-token (renovar token expirado)
 * POST /api/auth/forgot-password (solicitar reset)
 * POST /api/auth/reset-password (resetear con token)
 * POST /api/auth/verify-email (verificar email)
 * POST /api/auth/resend-verification (reenviar email)
 */

export default router;