import { Router } from 'express';
import userRoutes from './userRoutes';
import authRoutes from './authRoutes';

const router = Router();

// Ruta principal de la API
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to HawkPulse API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      register: '/api/users/register',
      profile: '/api/users/profile',
      login: '/api/auth/login',
      logout: '/api/auth/logout'
    }
  });
});

// Rutas de usuarios
router.use('/users', userRoutes);

// Rutas de autenticación
router.use('/auth', authRoutes);

export default router;