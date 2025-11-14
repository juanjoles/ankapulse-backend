import { Router } from 'express';
import { 
  requestPasswordReset, 
  resetPassword 
} from '../controllers/passwordController';

const router = Router();

// Solicitar reset (envía email)
router.post('/request-reset', requestPasswordReset);

// Resetear contraseña (con token)
router.post('/reset', resetPassword);

export default router;