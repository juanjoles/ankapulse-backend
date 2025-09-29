import { auth0Config, verifyAuth0Token } from '../config/auth0';

export interface Auth0UserProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}

export interface Auth0TokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

export class Auth0Utils {
  // Intercambiar código de autorización por tokens
  static async exchangeCodeForTokens(code: string): Promise<Auth0TokenResponse> {
    try {
      const response = await fetch(`https://${auth0Config.domain}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: auth0Config.clientId,
          client_secret: auth0Config.clientSecret,
          code,
          redirect_uri: auth0Config.callbackURL,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as Auth0TokenResponse;
    } catch (error) {
      console.error('Error intercambiando código por tokens:', error);
      throw new Error('Error obteniendo tokens de Auth0');
    }
  }

  // Obtener perfil del usuario desde Auth0
  static async getUserProfile(accessToken: string): Promise<Auth0UserProfile> {
    try {
      const response = await fetch(`https://${auth0Config.domain}/userinfo`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as Auth0UserProfile;
    } catch (error) {
      console.error('Error obteniendo perfil de usuario:', error);
      throw new Error('Error obteniendo información del usuario');
    }
  }

  // Validar y decodificar token JWT de Auth0
  static async validateAuth0JWT(token: string): Promise<Auth0UserProfile> {
    try {
      const payload = await verifyAuth0Token(token);
      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        email_verified: payload.email_verified || false,
      };
    } catch (error) {
      throw new Error('Token Auth0 inválido');
    }
  }

  // Determinar el proveedor basado en el sub de Auth0
  static getProviderFromAuth0Sub(sub: string): string {
    if (sub.startsWith('google-oauth2|')) return 'google';
    if (sub.startsWith('github|')) return 'github';
    if (sub.startsWith('auth0|')) return 'email';
    return 'unknown';
  }

  // Logout desde Auth0
  static getLogoutUrl(returnTo?: string): string {
    const params = new URLSearchParams({
      client_id: auth0Config.clientId,
      ...(returnTo && { returnTo })
    });
    
    return `https://${auth0Config.domain}/v2/logout?${params.toString()}`;
  }

  // Verificar si un token es de Auth0 (vs token local)
  static isAuth0Token(token: string): boolean {
    try {
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      // Los tokens de Auth0 tienen issuer específico
      return decoded.iss && decoded.iss.includes(auth0Config.domain);
    } catch {
      return false;
    }
  }
}