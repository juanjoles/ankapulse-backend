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
          sentAt: {
            gte: thirtyMinutesAgo,
          },
        },
        orderBy: {
          sentAt: 'desc',
        },
      });

      if (recentAlert) {
        console.log(`⏭️ Alert recently sent for check ${checkId} (${recentAlert.sentAt.toISOString()}), skipping to avoid spam...`);
        return null;
      }

      // Obtener información del check, resultado y usuario
      const check = await prisma.check.findUnique({
        where: { id: checkId },
        include: {
          user: true,
        },
      });

      if (!check) {
        console.error(`❌ Check ${checkId} not found`);
        return null;
      }

      // Obtener el resultado específico que causó el fallo
      const checkResult = await prisma.checkResult.findUnique({
        where: { id: checkResultId },
      });

      const userProfile = await prisma.profile.findUnique({
        where: { userId: check.user.id },
        select: { telegramChatId: true }
      });

      console.log(`
╔════════════════════════════════════════════════════════════╗
║                    🚨 ALERT TRIGGERED                      ║
╠════════════════════════════════════════════════════════════╣
║ Check ID:     ${checkId}
║ Check Name:   ${check.name || check.url}
║ URL:          ${check.url}
║ User Email:   ${check.user.email}
║ Status:       ${checkResult?.statusCode || 'Unknown'}
║ Region:       ${checkResult?.region || 'Unknown'}
║ Timestamp:    ${new Date().toISOString()}
╠════════════════════════════════════════════════════════════╣
║ 📧 Sending email notification...
╚════════════════════════════════════════════════════════════╝
      `);

      // Enviar email real
      const emailResult = await emailService.sendAlertEmail({
        userEmail: check.user.email,
        userName: check.user.nombre || undefined, // ✅ Usar 'nombre' del schema
        checkName: check.name || check.url,
        checkUrl: check.url,
        errorMessage: checkResult?.errorMessage || undefined, // ✅ 'errorMessage' no 'error'
        statusCode: checkResult?.statusCode || undefined,
        latency: checkResult?.latencyMs || undefined, // ✅ 'latencyMs' no 'latency'
        region: checkResult?.region || undefined,
        timestamp: new Date(),
      });

      //Enviar Telegram si está configurado
      let telegramResult: { success: boolean; reason?: string } | null = null;

      if (userProfile?.telegramChatId) {
        const telegramMessage = this.buildTelegramMessage(check, checkResult);
        telegramResult = await telegramService.sendAlert(
          check.user.id,
          userProfile.telegramChatId,
          telegramMessage
        );
      }
      const alerts = [];

      // Crear registro de alerta en BD
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

      // Telegram alert (si se envió)
      if (telegramResult) {
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

      if (emailResult.success) {
        console.log(`✅ Alert ${emailAlert.id} sent successfully to ${check.user.email}`);
        console.log(`   Email Message ID: ${emailResult.messageId}`);
      } else {
        console.error(`❌ Alert ${emailAlert.id} failed to send: ${emailResult.error}`);
      }

      if (telegramResult?.success) {
        console.log(`📱 Telegram alert sent to chat ${userProfile?.telegramChatId}`);
      } else if (telegramResult && !telegramResult.success) {
        console.log(`⚠️ Telegram alert failed: ${telegramResult.reason}`);
      }

      return alerts;

    } catch (error: any) {
      console.error(`❌ Error handling failure for check ${checkId}:`, error.message);
      
      // Intentar crear alerta marcada como fallida
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
}