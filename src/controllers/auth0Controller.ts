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

      // Manejar errores de Auth0
      if (error) {
        console.error('Error de Auth0:', error, error_description);
        res.status(400).json({
          status: 'error',
          message: `Error de autenticación: ${error_description || error}`
        });
        return;
      }

      if (!code) {
        res.status(400).json({
          status: 'error',
          message: 'Código de autorización no recibido'
        });
        return;
      }

      // Intercambiar código por tokens
      const tokens = await Auth0Utils.exchangeCodeForTokens(code as string);
      
      // Obtener información del usuario
      const userProfile = await Auth0Utils.getUserProfile(tokens.access_token);
      
      // Crear o encontrar usuario en la base de datos
      const result = await UserService.findOrCreateFromAuth0(userProfile);
      
      // Responder con información del usuario y token JWT local
      res.status(200).json({
        status: 'success',
        message: result.isNewUser ? 'Usuario registrado exitosamente' : 'Login exitoso',
        data: {
          user: result.user,
          token: result.token,
          isNewUser: result.isNewUser,
          provider: Auth0Utils.getProviderFromAuth0Sub(userProfile.sub)
        }
      });
    } catch (error) {
      console.error('Error en callback de Auth0:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error procesando autenticación'
      });
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