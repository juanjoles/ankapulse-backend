import jwt from 'jsonwebtoken';

// Configuración del cliente Auth0
export const auth0Config = {
  domain: process.env.AUTH0_DOMAIN || 'your-domain.auth0.com',
  clientId: process.env.AUTH0_CLIENT_ID || '',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
  callbackURL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:3000/auth/callback',
  audience: process.env.AUTH0_AUDIENCE || '',
};

// Validar token JWT de Auth0 (versión simplificada)
export const verifyAuth0Token = async (token: string): Promise<any> => {
  try {
    // Decodificar token sin verificar firma (para desarrollo)
    const decoded = jwt.decode(token, { complete: true });
    
    if (!decoded || !decoded.payload) {
      throw new Error('Token inválido');
    }

    const payload = decoded.payload as any;
    
    // Verificar que el token tenga estructura válida de Auth0
    if (!payload.sub || !payload.email) {
      throw new Error('Token no contiene información requerida');
    }

    // Verificar expiración
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expirado');
    }

    return payload;
  } catch (error) {
    throw new Error(`Error verificando token Auth0: ${error}`);
  }
};

// URLs de autorización para proveedores sociales
export const getAuthorizationUrl = (provider: 'google' | 'github', state?: string): string => {
  const baseURL = `https://${auth0Config.domain}/authorize`;
   const connectionMap = {
    google: 'google-oauth2',    // ← ESTE ES EL CAMBIO
    github: 'github'           // ← Este puede estar bien o ser 'github'
  };
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: auth0Config.clientId,
    redirect_uri: auth0Config.callbackURL,
    scope: 'openid email profile',
    connection: connectionMap[provider],
    ...(state && { state })
  });
  
  return `${baseURL}?${params.toString()}`;
};