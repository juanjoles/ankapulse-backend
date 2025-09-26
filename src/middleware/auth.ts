import { Request, Response, NextFunction } from 'express';
import { JWTUtils } from '../utils/jwt';
import { Auth0Utils } from '../utils/auth0';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    provider?: string; // NUEVO - para identificar origen del token
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

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
      // NUEVO - Validar token de Auth0
      try {
        const auth0Profile = await Auth0Utils.validateAuth0JWT(token);
        req.user = {
          userId: auth0Profile.sub, // Usar Auth0 sub como userId temporal
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
      // MANTENER - Validar token local (lógica original)
      const payload = JWTUtils.verifyToken(token);
      req.user = {
        userId: payload.userId,
        email: payload.email,
        provider: 'local'
      };
    }
    
    next();
  } catch (error) {
    console.error('Error verificando token:', error);
    res.status(403).json({
      status: 'error',
      message: 'Token inválido o expirado'
    });
  }
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