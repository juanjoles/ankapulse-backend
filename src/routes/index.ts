import { Router } from 'express';
import userRoutes from './userRoutes';
import authRoutes from './authRoutes';
import auth0Routes from './auth0Routes';
import checkRoutes from './checks.routes';

const router = Router();

// Ruta principal de la API
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to HawkPulse API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      // Autenticación tradicional
      register: '/api/users/register',
      profile: '/api/users/profile',
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      // Auth0 social login
      auth0Info: '/auth/info',
      googleLogin: '/auth/login/google',
      githubLogin: '/auth/login/github',
      auth0Callback: '/auth/callback',
      auth0Logout: '/auth/logout/auth0',
      // Checks endpoints
      checks: '/api/checks'
    },
    note: 'Sistema híbrido: autenticación tradicional + Auth0 social login + API monitoring'
  });
});

// Rutas de usuarios
router.use('/users', userRoutes);

// Rutas de autenticación tradicional
router.use('/auth', authRoutes);

// Rutas de checks
router.use('/checks', checkRoutes);

export default router;

// IMPORTANTE: Las rutas Auth0 van en el app.ts principal para evitar conflicto de prefijos