// controllers/alertController.ts
import { Request, Response } from 'express';
import { AlertService } from '../services/alert.service';

const alertService = new AlertService();

export class AlertController {
  
  getAlertSettings = async (req: Request, res: Response): Promise<void> => {
    try {   
    // Verificación de TypeScript
    if (!req.user) {
      console.log('❌ No req.user found');
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Ahora TypeScript sabe que req.user existe
    const userId = req.user.id || req.user.userId; 
    console.log('User ID extracted:', userId);
    
    if (!userId) {
      console.log('❌ No userId in req.user');
      res.status(401).json({ error: 'User ID not found' });
      return;
    }
      const settings = await alertService.getAlertSettings(userId);
      
      if (!settings) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }

      res.json(settings);
    } catch (error) {
      console.error('Error getting alert settings:', error);
      res.status(500).json({ error: 'Failed to get alert settings' });
    }
  }

  updateAlertSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
      console.log('❌ No req.user found');
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
      const userId = req.user.id || req.user.userId;
      const { emailAlertsEnabled, telegramAlertsEnabled, telegramChatId } = req.body;

      // Validaciones básicas
      if (typeof emailAlertsEnabled !== 'boolean' || typeof telegramAlertsEnabled !== 'boolean') {
        res.status(400).json({ error: 'Invalid alert settings' });
        return;
      }

      const result = await alertService.updateAlertSettings(userId, {
        emailAlertsEnabled,
        telegramAlertsEnabled,
        telegramChatId
      });

      if (!result.success) {
        res.status(result.statusCode || 400).json({ error: result.error });
        return;
      }

      res.json({
        message: 'Alert settings updated successfully',
        settings: result.data
      });
    } catch (error) {
      console.error('Error updating alert settings:', error);
      res.status(500).json({ error: 'Failed to update alert settings' });
    }
  }
}