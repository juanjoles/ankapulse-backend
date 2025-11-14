import { Request, Response } from 'express';
import prisma from '../models/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { emailService } from '../services/emailService'; 



export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email es requerido' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      res.json({ 
        message: 'Si el email existe, recibirás un link de recuperación' 
      });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'https://ankapulse.app'}/reset-password?token=${token}`;
    
    // ✅ Ahora usará el singleton con RESEND_API_KEY
    const emailResult = await emailService.sendPasswordResetEmail(user.email, resetUrl);
    
    if (!emailResult.success) {
      console.error('Failed to send reset email, but token created');
    }

    res.json({ 
      message: 'Si el email existe, recibirás un link de recuperación' 
    });

  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ error: 'Error al procesar solicitud' });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }

    const resetRequest = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetRequest) {
      res.status(400).json({ error: 'Token inválido' });
      return;
    }

    if (resetRequest.used) {
      res.status(400).json({ error: 'Este link ya fue utilizado' });
      return;
    }

    if (new Date() > resetRequest.expiresAt) {
      res.status(400).json({ error: 'Este link ha expirado' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: resetRequest.userId },
      data: { password: hashedPassword }
    });

    await prisma.passwordReset.update({
      where: { id: resetRequest.id },
      data: { used: true }
    });

    res.json({ message: 'Contraseña actualizada correctamente' });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Error al resetear contraseña' });
  }
}