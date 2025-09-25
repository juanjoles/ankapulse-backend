import jwt, { SignOptions } from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  email: string;
}

export class JWTUtils {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'hawkpulse_secret_key';
  private static readonly JWT_EXPIRES_IN: string | number = process.env.JWT_EXPIRES_IN || '7d';

  static generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: '7d'
    });
  }

  static verifyToken(token: string): JWTPayload {
    return jwt.verify(token, this.JWT_SECRET) as JWTPayload;
  }

  static decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }
}