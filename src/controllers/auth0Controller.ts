import { Request, Response } from 'express';
import { getAuthorizationUrl } from '../config/auth0';
import { Auth0Utils } from '../utils/auth0';
import { UserService } from '../services/userService';

export class Auth0Controller {
  // Redirigir a Google via Auth0
  static async loginWithGoogle(req: Request, res: Response): Promise<void> {
    try {
      const state = req.query.state as string || Math.random().toString(36);
      const authUrl = getAuthorizationUrl('google', state);
      
      res.redirect(authUrl);
    } catch (error) {
      console.error('Error iniciando login con Google:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error iniciando autenticación con Google'
      });
    }
  }

  // Redirigir a GitHub via Auth0
  static async loginWithGitHub(req: Request, res: Response): Promise<void> {
    try {
      const state = req.query.state as string || Math.random().toString(36);
      const authUrl = getAuthorizationUrl('github', state);
      
      res.redirect(authUrl);
    } catch (error) {
      console.error('Error iniciando login con GitHub:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error iniciando autenticación con GitHub'
      });
    }
  }

  // Manejar callback de Auth0
static async handleCallback(req: Request, res: Response): Promise<void> {
  try {
    const { code, error, error_description } = req.query;

    // URL del frontend
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3001';
    console.log('Frontend URL:', frontendURL);
    // Manejar errores de Auth0
    if (error) {
      console.error('Error de Auth0:', error, error_description);
      
      const errorURL = new URL(`${frontendURL}/callback`);
      errorURL.searchParams.set('error', 'auth_failed');
      errorURL.searchParams.set('message', error_description as string || error as string);
      
      res.redirect(errorURL.toString());
      return;
    }

    if (!code) {
      const errorURL = new URL(`${frontendURL}/callback`);
      errorURL.searchParams.set('error', 'no_code');
      errorURL.searchParams.set('message', 'Código de autorización no recibido');
      
      res.redirect(errorURL.toString());
      return;
    }

    // Intercambiar código por tokens
    const tokens = await Auth0Utils.exchangeCodeForTokens(code as string);
    
    // Obtener información del usuario
    const userProfile = await Auth0Utils.getUserProfile(tokens.access_token);
    
    // Crear o encontrar usuario en la base de datos
    const result = await UserService.findOrCreateFromAuth0(userProfile);
    
    // Establecer cookie segura con el token
    res.cookie('authToken', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: '/'
    });

    // Crear URL de callback exitoso con parámetros
    const successURL = new URL(`${frontendURL}/callback`);
    successURL.searchParams.set('success', 'true');
    successURL.searchParams.set('token', result.token);
    successURL.searchParams.set('isNewUser', result.isNewUser.toString());
    successURL.searchParams.set('provider', Auth0Utils.getProviderFromAuth0Sub(userProfile.sub));
    successURL.searchParams.set('userId', result.user.id);
    console.log(successURL.toString());
    // Redirigir al frontend
    res.redirect(successURL.toString());

  } catch (error) {
    console.error('Error en callback de Auth0:', error);
    
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3001';
    const errorURL = new URL(`${frontendURL}/callback`);
    errorURL.searchParams.set('error', 'server_error');
    errorURL.searchParams.set('message', 'Error procesando autenticación');
    
    res.redirect(errorURL.toString());
  }
}

  // Logout específico de Auth0
  static async logoutAuth0(req: Request, res: Response): Promise<void> {
    try {
      const returnTo = req.query.returnTo as string || req.headers.origin as string;
      const logoutUrl = Auth0Utils.getLogoutUrl(returnTo);
      
      res.json({
        status: 'success',
        message: 'Logout exitoso',
        logoutUrl: logoutUrl,
        instructions: 'Redirige al usuario a logoutUrl para logout completo de Auth0'
      });
    } catch (error) {
      console.error('Error en logout Auth0:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error en logout'
      });
    }
  }

  // Obtener información de Auth0 (para debugging)
  static async getAuth0Info(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        status: 'success',
        message: 'Información de Auth0',
        data: {
          domain: process.env.AUTH0_DOMAIN,
          clientId: process.env.AUTH0_CLIENT_ID,
          callbackUrl: process.env.AUTH0_CALLBACK_URL,
          endpoints: {
            google: '/auth/login/google',
            github: '/auth/login/github',
            callback: '/auth/callback'
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error obteniendo información'
      });
    }
  }
}