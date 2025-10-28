import { Request, Response } from 'express';
import { auth0 } from '../services/auth0';

export const auth0Controller = {
  // Other methods...

  loginWithGoogle: async (req: Request, res: Response) => {
    console.log('Starting loginWithGoogle method');
    try {
      console.log('Request body:', req.body);
      // Assuming auth0 has a method to handle Google login
      const result = await auth0.loginWithGoogle(req.body);
      console.log('Login successful, result:', result);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in loginWithGoogle:', error);
      return res.status(502).json({ error: 'Failed to login with Google' });
    }
  },

  // Other methods...
};