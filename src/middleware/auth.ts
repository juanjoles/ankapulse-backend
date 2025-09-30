import { Request, Response, NextFunction } from 'express';
import { JWTUtils } from '../utils/jwt';
import { Auth0Utils } from '../utils/auth0';

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      status: 'error',
      message: 'Token de acceso requerido'
    });
    return;
  }

  try {
    // Detectar si es token de Auth0 o token local
    const isAuth0Token = Auth0Utils.isAuth0Token(token);
    
    if (isAuth0Token) {
      // Validar token de Auth0
      try {
        const auth0Profile = await Auth0Utils.validateAuth0JWT(token);
        req.user = {
          sub: auth0Profile.sub,
          userId: auth0Profile.sub,  // Duplicar para compatibilidad
          email: auth0Profile.email,
          provider: 'auth0'
        };
      } catch (auth0Error) {
        console.error('Error validando token Auth0:', auth0Error);
        res.status(403).json({
          status: 'error',
          message: 'Token Auth0 inválido o expirado'
        });
        return;
      }
    } else {
      // Validar token local
      const payload = JWTUtils.verifyToken(token);
      req.user = {
        sub: payload.userId,
        userId: payload.userId,  // Mantener userId
        email: payload.email,
        provider: 'local'
      };
    }
    
    next();
  } catch (error) {
    res.status(403).json({
      status: 'error',
      message: 'Token inválido o expirado'
    });
  }
};

export const requireEmailVerified = (
  req: Request,  // <-- Cambiar de AuthenticatedRequest a Request
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.sub) {  // <-- Cambiar userId por sub (o usar userId si lo prefieres)
    res.status(401).json({
      status: 'error',
      message: 'Usuario no autenticado'
    });
    return;
  }

  next();
};