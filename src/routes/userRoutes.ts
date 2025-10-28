import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { validateUserRegistration } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// // POST /api/users/register - Registro de usuario (ruta pública)
// router.post('/register', validateUserRegistration, UserController.register);

// // POST /api/users/login - Iniciar sesión
// router.post('/login', UserController.login);

// PATCH /api/users/me - Actualizar perfil (requiere auth)
router.patch('/profile', authenticateToken, UserController.updateProfile);

// GET /api/users/profile - Obtener perfil (ruta protegida)
router.get('/profile', authenticateToken, UserController.getProfile);

export default router;