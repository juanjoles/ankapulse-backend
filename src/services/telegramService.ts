import TelegramBot from 'node-telegram-bot-api';
import prisma from '../models/prisma';

export class TelegramService {
  private bot: TelegramBot;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN no está configurado');
    }
    
    this.bot = new TelegramBot(token, { polling: true });
    console.log('📱 TelegramService inicializado');
  }
    private initializeBot() {
    // Responder a comando /start
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const firstName = msg.from?.first_name || 'User';
      
      console.log(`📱 /start received from ${firstName} (chatId: ${chatId})`);
      
      this.bot.sendMessage(chatId, `
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
              });

              // Responder a otros mensajes
              this.bot.on('message', (msg) => {
                if (!msg.text?.startsWith('/start')) {
                  const chatId = msg.chat.id;
                  this.bot.sendMessage(chatId, `
          Thanks for your message! 📱

          To get started with AnkaPulse alerts, send /start to get your Chat ID.

          Need help? Visit https://ankapulse.app
                  `);
                }
    });

    console.log('🤖 Bot listeners initialized');
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
}