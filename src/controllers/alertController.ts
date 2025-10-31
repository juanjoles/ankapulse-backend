// controllers/alertController.ts
import { Request, Response } from 'express';
import { AlertService } from '../services/alert.service';

const alertService = new AlertService();

export class AlertController {
  
  getAlertSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
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
      const userId = req.user?.id;
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