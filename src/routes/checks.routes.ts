import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateCheckCreation, validateCheckUpdate } from '../middleware/planValidation';
import {
  createCheck,
  updateCheck,
  deleteCheck,
  getChecks,
  getCheck,
  getCheckResults
} from '../controllers/checks.controller';

const router = Router();

// Rutas de checks (sin prefijo /checks porque ya está en app.ts)
router.post('/', authenticateToken, validateCheckCreation as any, createCheck);
router.get('/', authenticateToken, getChecks);
router.get('/:id/results', authenticateToken, getCheckResults); // Ruta específica primero
router.get('/:id', authenticateToken, getCheck);
router.put('/:id', authenticateToken, validateCheckUpdate as any, updateCheck);
router.delete('/:id', authenticateToken, deleteCheck);


export default router;