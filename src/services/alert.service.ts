// src/services/alertService.ts
import { PrismaClient } from '@prisma/client';
import { EmailService } from './emailService';
import { TelegramService } from './telegramService';

const prisma = new PrismaClient();
const emailService = new EmailService();
const telegramService = new TelegramService();

export class AlertService {
  
  async handleFailure(checkId: string, checkResultId: string) {
  try {
    // Verificar si ya se envió una alerta reciente (últimos 30 minutos)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const recentAlert = await prisma.alert.findFirst({
      where: {
        checkId,
        sentAt: { gte: thirtyMinutesAgo },
      },
      orderBy: { sentAt: 'desc' },
    });

    if (recentAlert) {
      console.log(`⏭️ Alert recently sent for check ${checkId} (${recentAlert.sentAt.toISOString()}), skipping to avoid spam...`);
      return null;
    }

    // Obtener información del check, resultado y usuario
    const check = await prisma.check.findUnique({
      where: { id: checkId },
      include: { user: true },
    });

    if (!check) {
      console.error(`❌ Check ${checkId} not found`);
      return null;
    }

    // Obtener el resultado específico que causó el fallo
    const checkResult = await prisma.checkResult.findUnique({
      where: { id: checkResultId },
    });

    // Obtener configuraciones de alertas del usuario
    const userProfile = await prisma.profile.findUnique({
      where: { userId: check.user.id },
      select: { 
        telegramChatId: true,
        emailAlertsEnabled: true,      
        telegramAlertsEnabled: true    
      }
    });

    console.log(`
╔════════════════════════════════════════════════════════════╗
║                    🚨 ALERT TRIGGERED                      ║
╠════════════════════════════════════════════════════════════╣
║ Check ID:     ${checkId}
║ Check Name:   ${check.name || check.url}
║ URL:          ${check.url}
║ User Email:   ${check.user.email}
║ Email alerts: ${userProfile?.emailAlertsEnabled ? 'ON' : 'OFF'}
║ Telegram alerts: ${userProfile?.telegramAlertsEnabled ? 'ON' : 'OFF'}
║ Status:       ${checkResult?.statusCode || 'Unknown'}
║ Region:       ${checkResult?.region || 'Unknown'}
║ Timestamp:    ${new Date().toISOString()}
╠════════════════════════════════════════════════════════════╣
║ 📧 Sending notifications...
╚════════════════════════════════════════════════════════════╝
    `);

    const alerts = [];
    let emailResult = null;
    let telegramResult = null;

    // 1. Enviar EMAIL solo si está habilitado
    if (userProfile?.emailAlertsEnabled) {
      emailResult = await emailService.sendAlertEmail({
        userEmail: check.user.email,
        userName: check.user.nombre || undefined,
        checkName: check.name || check.url,
        checkUrl: check.url,
        errorMessage: checkResult?.errorMessage || undefined,
        statusCode: checkResult?.statusCode || undefined,
        latency: checkResult?.latencyMs || undefined,
        region: checkResult?.region || undefined,
        timestamp: new Date(),
      });

      // Guardar resultado email
      const emailAlert = await prisma.alert.create({
        data: {
          checkId,
          checkResultId,
          alertType: 'email',
          success: emailResult.success,
          errorMessage: emailResult.error || null,
        },
      });
      alerts.push(emailAlert);
    }

    // 2. Enviar TELEGRAM solo si está habilitado Y configurado
    if (userProfile?.telegramAlertsEnabled && userProfile?.telegramChatId) {
      const telegramMessage = this.buildTelegramMessage(check, checkResult);
      telegramResult = await telegramService.sendAlert(
        check.user.id,
        userProfile.telegramChatId,
        telegramMessage
      );

      // Guardar resultado telegram
      const telegramAlert = await prisma.alert.create({
        data: {
          checkId,
          checkResultId,
          alertType: 'telegram',
          success: telegramResult.success,
          errorMessage: telegramResult.reason || null,
        },
      });
      alerts.push(telegramAlert);
    }

    // Logging de resultados
    if (emailResult?.success) {
      console.log(`✅ Email alert sent to ${check.user.email} - ID: ${emailResult.messageId}`);
    } else if (userProfile?.emailAlertsEnabled) {
      console.log(`❌ Email alert failed: ${emailResult?.error}`);
    } else {
      console.log(`⏭️ Email alerts disabled for user`);
    }

    if (telegramResult?.success) {
      console.log(`📱 Telegram alert sent to ${userProfile?.telegramChatId}`);
    } else if (userProfile?.telegramAlertsEnabled && userProfile?.telegramChatId) {
      console.log(`❌ Telegram alert failed: ${telegramResult?.reason}`);
    } else if (userProfile?.telegramAlertsEnabled && !userProfile?.telegramChatId) {
      console.log(`⚠️ Telegram enabled but no chat ID configured`);
    } else {
      console.log(`⏭️ Telegram alerts disabled for user`);
    }

    return alerts;

  } catch (error: any) {
    console.error(`❌ Error handling failure for check ${checkId}:`, error.message);
    
    try {
      await prisma.alert.create({
        data: {
          checkId,
          checkResultId,
          alertType: 'email',
          success: false,
          errorMessage: error.message,
        },
      });
    } catch (dbError) {
      console.error('❌ Could not save failed alert to database');
    }

    throw error;
  }
}

private buildTelegramMessage(check: any, checkResult: any): string {
    const timestamp = new Date().toLocaleString('es-AR', { 
      timeZone: 'America/Argentina/Buenos_Aires' 
    });

    return `
      🚨 <b>AnkaPulse Alert</b>

      <b>Service:</b> ${check.name || 'Unnamed Check'}
      <b>URL:</b> ${check.url}
      <b>Status:</b> ${checkResult?.statusCode || 'Unknown'} ❌
      <b>Region:</b> ${checkResult?.region || 'Unknown'}
      <b>Time:</b> ${timestamp}

      ${checkResult?.errorMessage ? `<b>Error:</b> ${checkResult.errorMessage}\n` : ''}

      <a href="https://ankapulse.app/checks/${check.id}">View Details →</a>
          `.trim();
  }
  /**
   * Obtener historial de alertas de un check
   */
  async getAlertHistory(checkId: string, limit: number = 20) {
    return await prisma.alert.findMany({
      where: { checkId },
      orderBy: { sentAt: 'desc' },
      take: limit,
      include: {
        checkResult: {
          select: {
            statusCode: true,
            latencyMs: true, // ✅ Corregido
            region: true,
            errorMessage: true, // ✅ Corregido
          },
        },
      },
    });
  }

  /**
   * Obtener estadísticas de alertas de un check
   */
  async getAlertStats(checkId: string) {
    const alerts = await prisma.alert.findMany({
      where: { checkId },
      select: {
        success: true,
        sentAt: true,
      },
    });

    const totalAlerts = alerts.length;
    const successfulAlerts = alerts.filter(a => a.success).length;
    const failedAlerts = totalAlerts - successfulAlerts;
    
    const lastAlert = alerts.length > 0 
      ? alerts.reduce((latest, current) => 
          current.sentAt > latest.sentAt ? current : latest
        )
      : null;

    return {
      totalAlerts,
      successfulAlerts,
      failedAlerts,
      successRate: totalAlerts > 0 ? (successfulAlerts / totalAlerts) * 100 : 0,
      lastAlertSentAt: lastAlert?.sentAt || null,
    };
  }


/**
 * Obtener configuración de alertas del usuario
 */
  async getAlertSettings(userId: string) {
    try {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: {
          emailAlertsEnabled: true,
          telegramAlertsEnabled: true,
          telegramChatId: true,
          planType: true,
        }
      });

      if (!profile) {
        return null;
      }

      return {
        emailAlertsEnabled: profile.emailAlertsEnabled,
        telegramAlertsEnabled: profile.telegramAlertsEnabled,
        telegramChatId: profile.telegramChatId || '',
        canUseTelegram: profile.planType !== 'free'
      };
    } catch (error) {
      console.error('Error getting alert settings:', error);
      throw error;
    }
  }

  /**
   * Actualizar configuración de alertas del usuario
   */
  async updateAlertSettings(userId: string, settings: {
    emailAlertsEnabled: boolean;
    telegramAlertsEnabled: boolean;
    telegramChatId?: string;
  }) {
    try {
      const { emailAlertsEnabled, telegramAlertsEnabled, telegramChatId } = settings;

      // Verificar plan para Telegram
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { planType: true }
      });

      if (!profile) {
        return {
          success: false,
          error: 'Profile not found',
          statusCode: 404
        };
      }

      // Validar que puede usar Telegram
      if (profile.planType === 'free' && telegramAlertsEnabled) {
        return {
          success: false,
          error: 'Telegram alerts require Starter or Pro plan',
          statusCode: 403
        };
      }

      // Actualizar configuración
      const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: {
          emailAlertsEnabled,
          telegramAlertsEnabled,
          telegramChatId: telegramChatId?.trim() || null,
        },
        select: {
          emailAlertsEnabled: true,
          telegramAlertsEnabled: true,
          telegramChatId: true,
        }
      });

      console.log(`✅ Alert settings updated for user ${userId}`);
      
      return {
        success: true,
        data: {
          emailAlertsEnabled: updatedProfile.emailAlertsEnabled,
          telegramAlertsEnabled: updatedProfile.telegramAlertsEnabled,
          telegramChatId: updatedProfile.telegramChatId || '',
        }
      };
    } catch (error) {
      console.error('Error updating alert settings:', error);
      return {
        success: false,
        error: 'Database error',
        statusCode: 500
      };
    }
  }
}