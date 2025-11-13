import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createOrUpdateStatusPage,
  getStatusPageConfig,
  getPublicStatusPage,
  disableStatusPage,
  checkSlugAvailability
} from '../controllers/statusPageController';

const router = Router();

// ====================================================
// RUTAS PRIVADAS (requieren autenticación)
// ====================================================

// Obtener configuración de status page del usuario autenticado
router.get('/config', authenticateToken, getStatusPageConfig);

// Crear o actualizar status page
router.post('/config', authenticateToken, createOrUpdateStatusPage);

// Deshabilitar status page
router.delete('/config', authenticateToken, disableStatusPage);

// Verificar disponibilidad de slug
router.get('/check-slug/:slug', authenticateToken, checkSlugAvailability);

// ====================================================
// RUTAS PÚBLICAS (sin autenticación)
// ====================================================

// Ver status page público por slug
// IMPORTANTE: Esta ruta debe ir al final para evitar conflictos
router.get('/:slug', getPublicStatusPage);

export default router;