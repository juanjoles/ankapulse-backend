import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// POST /api/auth/login - Login de usuario (placeholder)
router.post('/login', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Endpoint de login - Próximamente disponible',
    note: 'Por ahora usa /api/users/register que ya incluye autenticación automática'
  });
});

// POST /api/auth/logout - Logout de usuario (placeholder)
router.post('/logout', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Logout exitoso - En el frontend elimina el token del localStorage'
  });
});

export default router;