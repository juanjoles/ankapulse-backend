import express, { Request, Response } from 'express';
import { TelegramService } from '../services/telegramService';

export class TelegramController {
  private static telegramService: TelegramService;

  static initialize(telegramService: TelegramService) {
    this.telegramService = telegramService;
  }

  /**
   * Procesar webhook de Telegram
   * POST /api/telegram/webhook
   */
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      console.log('📱 Webhook recibido de Telegram:', req.body);
      
      if (!this.telegramService) {
        console.error('❌ TelegramService no inicializado');
        res.status(500).json({ error: 'Service not initialized' });
        return;
      }

      await this.telegramService.processWebhook(req.body);
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('❌ Error en webhook de Telegram:', error);
      res.status(500).json({ 
        error: 'Error procesando webhook',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Obtener información del webhook
   * GET /api/telegram/webhook-info
   */
  static async getWebhookInfo(req: Request, res: Response): Promise<void> {
    try {
      if (!this.telegramService) {
        res.status(500).json({ error: 'Service not initialized' });
        return;
      }

      const info = await this.telegramService.getWebhookInfo();
      res.status(200).json({ success: true, data: info });
    } catch (error) {
      console.error('❌ Error obteniendo info del webhook:', error);
      res.status(500).json({ 
        error: 'Error obteniendo información',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Health check del servicio
   * GET /api/telegram/health
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        status: 'OK',
        service: 'Telegram Bot',
        mode: process.env.NODE_ENV === 'production' ? 'webhook' : 'polling',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Health check failed' });
    }
  }
}