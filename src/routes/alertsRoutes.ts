// routes/alertRoutes.ts
import { Router } from 'express';
import { AlertController } from '../controllers/alertController';
import { authenticateToken } from '../middleware/auth'; // Ajusta según tu estructura

const router = Router();
const alertController = new AlertController();

// GET /api/alerts/settings - Obtener configuración actual
router.get('/settings', authenticateToken, async (req, res) => {
  await alertController.getAlertSettings(req, res);
});

// PUT /api/alerts/settings - Actualizar configuración
router.put('/settings', authenticateToken, async (req, res) => {
  await alertController.updateAlertSettings(req, res);
});

export default router;