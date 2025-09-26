import { Request, Response, NextFunction } from 'express';
import { JWTUtils } from '../utils/jwt';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      status: 'error',
      message: 'Token de acceso requerido'
    });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, decoded: any) => {
    if (err) {
      res.status(403).json({
        status: 'error',
        message: 'Token inválido o expirado'
      });
      return;
    }

    req.user = decoded as { userId: string; email: string };
    next();
  });
};

export const requireEmailVerified = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.userId) {
    res.status(401).json({
      status: 'error',
      message: 'Usuario no autenticado'
    });
    return;
  }

  // Por ahora permitimos acceso, pero puedes implementar verificación de email aquí
  // if (!req.user.emailVerified) {
  //   res.status(403).json({
  //     status: 'error',
  //     message: 'Verificación de email requerida'
  //   });
  //   return;
  // }

  next();
};