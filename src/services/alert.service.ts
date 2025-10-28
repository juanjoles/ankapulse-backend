// src/services/alertService.ts
import { PrismaClient } from '@prisma/client';
import { EmailService } from './emailService';

const prisma = new PrismaClient();
const emailService = new EmailService();

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

      // Crear registro de alerta en BD
      const alert = await prisma.alert.create({
        data: {
          checkId,
          checkResultId,
          alertType: 'email',
          success: emailResult.success,
          errorMessage: emailResult.error || null,
        },
      });

      if (emailResult.success) {
        console.log(`✅ Alert ${alert.id} sent successfully to ${check.user.email}`);
        console.log(`   Email Message ID: ${emailResult.messageId}`);
      } else {
        console.error(`❌ Alert ${alert.id} failed to send: ${emailResult.error}`);
      }

      return alert;

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