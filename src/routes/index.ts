import { Router } from 'express';
import userRoutes from './userRoutes';
import authRoutes from './authRoutes';
import auth0Routes from './auth0Routes';

const router = Router();

// Ruta principal de la API
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to HawkPulse API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      // Autenticación tradicional (MANTENER)
      register: '/api/users/register',
      profile: '/api/users/profile',
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      // Nuevas rutas Auth0 (AGREGAR)
      auth0Info: '/auth/info',
      googleLogin: '/auth/login/google',
      githubLogin: '/auth/login/github',
      auth0Callback: '/auth/callback',
      auth0Logout: '/auth/logout/auth0'
    },
    note: 'Sistema híbrido: autenticación tradicional + Auth0 social login'
  });
});

// Rutas de usuarios (MANTENER)
router.use('/users', userRoutes);

// Rutas de autenticación tradicional (MANTENER)
router.use('/auth', authRoutes);

export default router;

// IMPORTANTE: Las rutas Auth0 van en el app.ts principal para evitar conflicto de prefijos
