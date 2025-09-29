import { Router } from 'express';
import { Auth0Controller } from '../controllers/auth0Controller';

const router = Router();

// GET /auth/login/google - Iniciar login con Google
router.get('/login/google', Auth0Controller.loginWithGoogle);

// GET /auth/login/github - Iniciar login con GitHub  
router.get('/login/github', Auth0Controller.loginWithGitHub);

// GET /auth/callback - Manejar callback de Auth0
router.get('/callback', Auth0Controller.handleCallback);

// POST /auth/logout/auth0 - Logout específico de Auth0
router.post('/logout/auth0', Auth0Controller.logoutAuth0);

// GET /auth/info - Información de configuración Auth0 (para debugging)
router.get('/info', Auth0Controller.getAuth0Info);

export default router;