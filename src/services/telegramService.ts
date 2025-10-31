import TelegramBot from 'node-telegram-bot-api';
import prisma from '../models/prisma';

export class TelegramService {
  private bot: TelegramBot;
  private webhookUrl: string;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN no está configurado');
    }
    
    const isProduction = process.env.NODE_ENV === 'production';
    this.webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || '';
    
    if (isProduction && this.webhookUrl) {
      // Producción: Usar webhooks
      this.bot = new TelegramBot(token, { polling: false });
      this.setupWebhook();
    } else {
      // Desarrollo: Usar polling
      this.bot = new TelegramBot(token, { polling: true });
      this.initializeBot();
    }
    
    console.log('📱 TelegramService inicializado');
  }

  private async setupWebhook() {
    try {
      // Eliminar webhook anterior
      await this.bot.deleteWebHook();
      
      // Configurar nuevo webhook
      const webhookSet = await this.bot.setWebHook(`${this.webhookUrl}/api/telegram/webhook`, {
        allowed_updates: ['message']
      });
      
      if (webhookSet) {
        console.log('🎣 Webhook de Telegram configurado exitosamente');
      } else {
        console.error('❌ Error configurando webhook de Telegram');
      }
    } catch (error) {
      console.error('❌ Error en setup de webhook:', error);
    }
  }

  // Método para procesar webhooks
  async processWebhook(body: any): Promise<void> {
    try {
      if (body.message) {
        await this.handleMessage(body.message);
      }
    } catch (error) {
      console.error('❌ Error procesando webhook:', error);
    }
  }

  private async handleMessage(message: any): Promise<void> {
    const chatId = message.chat.id;
    const text = message.text;
    const firstName = message.from?.first_name || 'User';

    console.log(`📱 Message received: "${text}" from ${firstName} (${chatId})`);

    if (text === '/start') {
      await this.bot.sendMessage(chatId, `
🦅 <b>Welcome to AnkaPulse Alerts!</b>

Hello ${firstName}! 👋

Your Telegram Chat ID is: <code>${chatId}</code>

<b>Next steps:</b>
1. Copy the Chat ID above
2. Go to your AnkaPulse dashboard  
3. Paste it in Settings → Notifications
4. Save and enjoy instant alerts! ⚡

<i>Note: Telegram alerts are available for Starter and Pro plans only.</i>
      `, { 
        parse_mode: 'HTML' 
      });
    } else {
      await this.bot.sendMessage(chatId, `
Thanks for your message! 📱

To get started with AnkaPulse alerts, send /start to get your Chat ID.

Need help? Visit https://ankapulse.app
      `);
    }
  }

  private initializeBot(): void {
    // Responder a comando /start
    this.bot.onText(/\/start/, async (msg) => {
      await this.handleMessage(msg);
    });

    // Responder a otros mensajes
    this.bot.on('message', async (msg) => {
      if (!msg.text?.startsWith('/start')) {
        await this.handleMessage(msg);
      }
    });

    console.log('🤖 Bot listeners initialized (polling mode)');
  }

  async canUseTelegram(userId: string): Promise<boolean> {
    try {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { planType: true }
      });

      // Solo starter y pro pueden usar Telegram
      return profile?.planType === 'starter' || profile?.planType === 'pro';
    } catch (error) {
      console.error('❌ Error verificando plan para Telegram:', error);
      return false;
    }
  }

  async sendAlert(userId: string, chatId: string, message: string): Promise<{ success: boolean; reason?: string }> {
    // Verificar si el usuario puede usar Telegram
    const canUse = await this.canUseTelegram(userId);
    if (!canUse) {
      return { 
        success: false, 
        reason: 'Telegram alerts require Starter or Pro plan' 
      };
    }

    try {
      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'HTML',
        disable_web_page_preview: true 
      });
      console.log(`📱 Telegram alert sent to ${chatId} (user: ${userId})`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error enviando alerta Telegram:`, error);
      return { 
        success: false, 
        reason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Método para obtener información del webhook (útil para debugging)
  async getWebhookInfo(): Promise<any> {
    try {
      const info = await this.bot.getWebHookInfo();
      console.log('📊 Webhook info:', info);
      return info;
    } catch (error) {
      console.error('❌ Error obteniendo info del webhook:', error);
      return null;
    }
  }

  // Método para eliminar webhook (útil para mantenimiento)
  async removeWebhook(): Promise<boolean> {
    try {
      const removed = await this.bot.deleteWebHook();
      console.log('🗑️ Webhook eliminado:', removed);
      return removed;
    } catch (error) {
      console.error('❌ Error eliminando webhook:', error);
      return false;
    }
  }
}