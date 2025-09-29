import { Router } from 'express';
import { CheckController } from '../controllers/checkController';
import { authenticateToken } from '../middleware/auth';
import { validateCheckCreation } from '../middleware/validation';

const router = Router();
const checkController = new CheckController();

// POST /api/checks - Crear nuevo check
router.post('/', authenticateToken, validateCheckCreation, checkController.createCheck);

// GET /api/checks - Obtener checks del usuario
router.get('/', authenticateToken, checkController.getUserChecks);

// GET /api/checks/:id - Obtener check específico
router.get('/:id', authenticateToken, checkController.getCheckById);

export default router;